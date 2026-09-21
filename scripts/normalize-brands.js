/**
 * Backfill brandKey and collapse display spellings to the canonical brand name.
 *
 * Usage:
 *   node scripts/normalize-brands.js           # dry-run (default)
 *   node scripts/normalize-brands.js --apply   # write changes
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local
 */
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function slugifySeoValue(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeDisplayField(val) {
    if (val === null || val === undefined) return '';
    return String(val)
        .normalize('NFKC')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[.,;:]+$/g, '')
        .trim();
}

function brandKeyFrom(val) {
    const display = normalizeDisplayField(val);
    return display ? slugifySeoValue(display) : '';
}

function collapseBrandDisplays(entries) {
    const groups = new Map();
    for (const entry of entries) {
        const display = normalizeDisplayField(entry.brand);
        if (!display) continue;
        const key = normalizeDisplayField(entry.brandKey) || brandKeyFrom(display);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, new Map());
        const spellings = groups.get(key);
        spellings.set(display, (spellings.get(display) || 0) + 1);
    }
    const canonical = new Map();
    for (const [key, spellings] of groups) {
        let best = '';
        let bestCount = -1;
        let bestScore = -1;
        for (const [spelling, count] of spellings) {
            const score =
                spelling !== spelling.toLowerCase() && spelling !== spelling.toUpperCase()
                    ? 2
                    : spelling === spelling.toUpperCase()
                      ? 1
                      : 0;
            if (
                count > bestCount ||
                (count === bestCount && score > bestScore) ||
                (count === bestCount && score === bestScore && spelling.localeCompare(best) < 0)
            ) {
                best = spelling;
                bestCount = count;
                bestScore = score;
            }
        }
        if (best) canonical.set(key, best);
    }
    return canonical;
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();
const apply = process.argv.includes('--apply');

async function main() {
    const snapshot = await db.collection('products').get();
    const canonicalByKey = collapseBrandDisplays(
        snapshot.docs.map((doc) => {
            const data = doc.data();
            return { brand: data.brand, brandKey: data.brandKey };
        })
    );

    console.log(`Scanned ${snapshot.size} products. Canonical brands: ${canonicalByKey.size}`);
    for (const [key, display] of [...canonicalByKey.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        console.log(`  ${key} → ${display}`);
    }

    let batch = db.batch();
    let pending = 0;
    let updated = 0;
    let unchanged = 0;
    const commits = [];

    const flush = async () => {
        if (pending === 0) return;
        commits.push(batch.commit());
        batch = db.batch();
        pending = 0;
    };

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const rawBrand = normalizeDisplayField(data.brand);
        if (!rawBrand) {
            const clearKey = data.brandKey ? { brandKey: '' } : null;
            if (clearKey && apply) {
                batch.update(doc.ref, clearKey);
                pending += 1;
                updated += 1;
                if (pending >= 400) await flush();
            } else if (clearKey) {
                updated += 1;
            } else {
                unchanged += 1;
            }
            continue;
        }

        const key = brandKeyFrom(rawBrand);
        const canonical = canonicalByKey.get(key) || rawBrand;
        const next = { brand: canonical, brandKey: key };
        const needsUpdate = data.brand !== next.brand || data.brandKey !== next.brandKey;

        if (!needsUpdate) {
            unchanged += 1;
            continue;
        }

        updated += 1;
        console.log(`${apply ? 'UPDATE' : 'WOULD UPDATE'} ${doc.id}: "${data.brand}" → "${next.brand}" (${next.brandKey})`);
        if (apply) {
            batch.update(doc.ref, next);
            pending += 1;
            if (pending >= 400) await flush();
        }
    }

    if (apply) {
        await flush();
        await Promise.all(commits);
    }

    console.log(`\nDone. ${apply ? 'Updated' : 'Would update'}: ${updated}, unchanged: ${unchanged}`);
    if (!apply) console.log('Re-run with --apply to write changes.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
