#!/usr/bin/env node
/*
 * Remove test/dummy orders from Firestore, keeping only real completed orders.
 *
 * Step 1 (no --before): writes ALL-orders-timeline.csv, every order oldest first with
 * hints (placed by a staff account, test-looking name/email/phone), and suggests the
 * date the first real customer order came in. Nothing is marked for deletion.
 *
 * Step 2 (--before=YYYY-MM-DD[THH:MM]): every order placed BEFORE that moment is a
 * deletion candidate, together with records that point at those orders:
 * transactions, notifications, analytics_purchases, refunds. Orders on/after it are kept.
 * Use --keep / --delete to override individual orders.
 *
 * Nothing is deleted unless you pass --apply AND the --confirm code printed by the
 * dry run. The code is a hash of the exact id list, so if the data changes between
 * the dry run and the apply, the apply refuses and you must review again.
 *
 * Every run first writes a full JSON backup of the touched collections.
 *
 * Usage (from the repo root, with Firebase admin credentials in the environment,
 * same variables as the site: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json):
 *
 *   node scripts/cleanup-dummy-orders.js                      # timeline: backup + list all orders
 *   node scripts/cleanup-dummy-orders.js --before=2026-03-01  # dry run: list orders before that date
 *   node scripts/cleanup-dummy-orders.js --keep=ID1,ID2       # also keep these order ids
 *   node scripts/cleanup-dummy-orders.js --delete=ID3         # also delete these (even if they match KEEP)
 *   node scripts/cleanup-dummy-orders.js --before=2026-03-01 --apply --confirm=XXXXXXXX [same --keep/--delete flags]
 *
 * Reports also list customer accounts that have no kept order (possible test users).
 * Those are NEVER deleted by this script; they are only listed for review.
 */
const admin = require('firebase-admin');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

try { require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') }); } catch { /* optional */ }

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    if (process.env.FIRESTORE_EMULATOR_HOST) {
        admin.initializeApp({ projectId: projectId || 'demo-melagri' });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else if (projectId && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n'),
            }),
        });
    } else {
        console.error('Missing Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (e.g. in .env.local).');
        process.exit(1);
    }
}
const db = admin.firestore();

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
}));
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const forceKeep = new Set(list(args.keep));
const forceDelete = new Set(list(args.delete));
const APPLY = Boolean(args.apply);

const RELATED = [
    { collection: 'transactions', field: 'orderId' },
    { collection: 'notifications', field: 'orderId' },
    { collection: 'refunds', field: 'orderId' },
];

const BEFORE = typeof args.before === 'string' ? new Date(args.before.length === 10 ? `${args.before}T00:00:00+03:00` : args.before) : null;
if (args.before && (!BEFORE || isNaN(BEFORE))) { console.error(`Bad --before date: ${args.before}`); process.exit(1); }
if (APPLY && !BEFORE) { console.error('--apply needs --before=DATE (the cutoff you reviewed).'); process.exit(1); }

function orderTime(o) {
    const v = o.date || o.createdAt;
    const d = v && typeof v.toDate === 'function' ? v.toDate() : new Date(v);
    return isNaN(d) ? null : d;
}
const TEST_RE = /\b(test|testing|demo|dummy|sample|example|fake|asdf|qwerty)\b|@example\.|@test\./i;
function isRealOrder(o) {
    if (!BEFORE) return true; // timeline mode: nothing is marked for deletion
    const t = orderTime(o);
    return Boolean(t && t >= BEFORE); // orders with no readable date are kept; review them by hand
}

function toPlain(v) {
    if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
    if (Array.isArray(v)) return v.map(toPlain);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toPlain(x)]));
    return v;
}

function csv(rows) {
    if (!rows.length) return '';
    const cols = Object.keys(rows[0]);
    const esc = (x) => {
        const s = x === undefined || x === null ? '' : String(x);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

async function backup(dir, names) {
    fs.mkdirSync(dir, { recursive: true });
    const out = {};
    for (const name of names) {
        const snap = await db.collection(name).get();
        out[name] = snap.docs;
        fs.writeFileSync(path.join(dir, `${name}.json`),
            JSON.stringify(snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) })), null, 2));
        console.log(`  backed up ${name}: ${snap.size} docs`);
    }
    return out;
}

async function main() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.resolve(process.cwd(), 'backups', `firestore-${stamp}`);
    console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'}  project=${admin.app().options.credential?.projectId || process.env.FIREBASE_PROJECT_ID || '(default)'}`);
    console.log(`Backing up to ${dir}`);
    const data = await backup(dir, ['orders', 'users', 'analytics_purchases', 'c2bPayments', ...RELATED.map((r) => r.collection)]);

    const staffIds = new Set(data.users.filter((d) => ['admin', 'super-admin'].includes(d.data().role)).map((d) => d.id));
    const phoneCount = {};
    for (const d of data.orders) { const ph = d.data().phone; if (ph) phoneCount[ph] = (phoneCount[ph] || 0) + 1; }
    const keep = [];
    const del = [];
    const timeline = [];
    for (const d of data.orders) {
        const o = d.data();
        const real = forceDelete.has(d.id) ? false : (forceKeep.has(d.id) || isRealOrder(o));
        const who = `${o.userName || ''} ${o.userEmail || ''}`;
        const staff = staffIds.has(o.userId);
        const hints = [staff && 'staff account', TEST_RE.test(who) && 'test-looking name/email', o.phone && phoneCount[o.phone] >= 5 && 'phone used on 5+ orders'].filter(Boolean).join('; ');
        const row = {
            id: d.id,
            placed: orderTime(o)?.toISOString() || '(no date)',
            date: toPlain(o.date || o.createdAt || ''),
            customer: o.userName || o.userEmail || '',
            phone: o.phone || '',
            total: o.total ?? '',
            status: o.status || '',
            paymentStatus: o.paymentStatus || '',
            paymentMethod: o.paymentMethod || '',
            transactionId: o.transactionId || '',
            items: (o.items || []).map((i) => `${i.quantity}x ${i.name}`).join('; '),
            hints,
        };
        timeline.push(row);
        (real ? keep : del).push(row);
    }
    const byDate = (a, b) => String(a.placed).localeCompare(String(b.placed));
    keep.sort(byDate); del.sort(byDate); timeline.sort(byDate);
    const delIds = new Set(del.map((r) => r.id));

    // Related records pointing at deleted orders.
    const related = [];
    for (const { collection, field } of RELATED) {
        for (const d of data[collection]) {
            const ref = d.data()[field];
            if (ref && delIds.has(ref)) related.push({ collection, id: d.id, orderId: ref });
        }
    }
    for (const d of data.analytics_purchases) {
        if (delIds.has(d.id)) related.push({ collection: 'analytics_purchases', id: d.id, orderId: d.id });
    }

    // M-Pesa C2B payments matched to a deleted order: real money, never deleted; listed for review.
    const c2bWarnings = data.c2bPayments
        .filter((d) => delIds.has(d.data().matchedOrderId))
        .map((d) => ({ id: d.id, matchedOrderId: d.data().matchedOrderId, amount: d.data().amount ?? '', reference: d.data().transID || d.data().reference || '' }));

    // Customer accounts with no kept order (review only, never deleted here).
    const keptUsers = new Set(data.orders.filter((d) => !delIds.has(d.id)).map((d) => d.data().userId));
    const userReview = data.users
        .filter((d) => !['admin', 'super-admin'].includes(d.data().role) && !keptUsers.has(d.id))
        .map((d) => ({ id: d.id, name: d.data().name || d.data().displayName || '', email: d.data().email || '', phone: d.data().phone || '', role: d.data().role || '', createdAt: toPlain(d.data().createdAt || '') }));

    const plan = [...[...delIds].sort().map((id) => `orders/${id}`), ...related.map((r) => `${r.collection}/${r.id}`).sort()];
    const code = crypto.createHash('sha256').update(plan.join('\n')).digest('hex').slice(0, 8);

    fs.writeFileSync(path.join(dir, 'ALL-orders-timeline.csv'), csv(timeline));
    fs.writeFileSync(path.join(dir, 'KEEP-orders.csv'), csv(keep));
    fs.writeFileSync(path.join(dir, 'DELETE-orders.csv'), csv(del));
    fs.writeFileSync(path.join(dir, 'DELETE-related.csv'), csv(related));
    fs.writeFileSync(path.join(dir, 'REVIEW-c2b-payments-on-deleted-orders.csv'), csv(c2bWarnings));
    fs.writeFileSync(path.join(dir, 'REVIEW-users-without-real-orders.csv'), csv(userReview));

    // Timeline summary: orders per month, and the first order that looks like a real customer.
    const perMonth = {};
    for (const r of timeline) { const m = r.placed.slice(0, 7); perMonth[m] = (perMonth[m] || 0) + 1; }
    console.log('\nOrders per month:');
    for (const [m, n] of Object.entries(perMonth)) console.log(`  ${m}  ${String(n).padStart(4)}`);
    const firstReal = timeline.find((r) => !r.hints && r.paymentStatus === 'Paid' && r.placed !== '(no date)');
    if (firstReal) console.log(`\nFirst paid order with no test/staff hints: ${firstReal.placed}  ${firstReal.id}  ${firstReal.customer}  KSh ${firstReal.total}  (${firstReal.status})`);
    console.log('Read ALL-orders-timeline.csv to confirm where testing stopped and real customers started.');
    if (!BEFORE) {
        console.log(`\nTimeline only. Nothing was marked or deleted. Reports: ${dir}`);
        console.log('Next: node scripts/cleanup-dummy-orders.js --before=YYYY-MM-DD   (Nairobi time; orders before that date are listed for deletion)\n');
        return;
    }

    console.log(`\nCutoff: orders placed before ${BEFORE.toISOString()}`);
    console.log(`Orders total: ${data.orders.length}`);
    console.log(`  KEEP   (on/after cutoff): ${keep.length}`);
    console.log(`  DELETE (before cutoff):   ${del.length}`);
    const tally = {};
    for (const r of del) { const k = `${r.paymentStatus || 'no payment status'} / ${r.status || 'no status'}`; tally[k] = (tally[k] || 0) + 1; }
    for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(4)}  ${k}`);
    console.log(`  Related records to delete: ${related.length}`);
    if (c2bWarnings.length) console.log(`  ⚠ ${c2bWarnings.length} M-Pesa C2B payment(s) are matched to orders marked DELETE. Check REVIEW-c2b-payments-on-deleted-orders.csv; those may be real sales.`);
    console.log(`  Customer accounts with no kept order (listed only): ${userReview.length}`);
    console.log(`\nReports written to ${dir}`);
    console.log(`Confirm code for exactly this list: ${code}`);

    if (!APPLY) {
        console.log('\nDry run only. Nothing was deleted. Review DELETE-orders.csv, then re-run with:');
        console.log(`  node scripts/cleanup-dummy-orders.js --before=${args.before} --apply --confirm=${code}${args.keep ? ` --keep=${args.keep}` : ''}${args.delete ? ` --delete=${args.delete}` : ''}\n`);
        return;
    }
    if (args.confirm !== code) {
        console.error(`\nRefusing to delete: --confirm=${args.confirm || '(missing)'} does not match ${code}. The data or flags changed since your dry run. Review the new reports first.`);
        process.exit(2);
    }

    let n = 0;
    for (let i = 0; i < plan.length; i += 400) {
        const batch = db.batch();
        for (const p of plan.slice(i, i + 400)) batch.delete(db.doc(p));
        await batch.commit();
        n += Math.min(400, plan.length - i);
        console.log(`  deleted ${n}/${plan.length}`);
    }
    await db.collection('adminAuditLog').add({
        action: 'dummy_orders_cleanup', actorId: 'script', ordersDeleted: delIds.size, relatedDeleted: related.length,
        backupDir: dir, confirmCode: code, createdAt: new Date().toISOString(),
    });
    console.log(`\n✅ Deleted ${delIds.size} orders and ${related.length} related records. Backup: ${dir}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
