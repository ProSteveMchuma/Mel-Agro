/**
 * Promote (or create) a Firestore user as super-admin.
 *
 * Usage:
 *   node --env-file-if-exists=.env.local scripts/set-super-admin.js proinnovationtech@gmail.com
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
 */
const admin = require('firebase-admin');

const emailArg = (process.argv[2] || '').trim().toLowerCase();
if (!emailArg || !emailArg.includes('@')) {
    console.error('Usage: node scripts/set-super-admin.js <email>');
    process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
}

const db = admin.firestore();

async function findUsersByEmail(email) {
    const exact = await db.collection('users').where('email', '==', email).get();
    if (!exact.empty) return exact.docs;
    // Case / whitespace variants seen in older writes
    const all = await db.collection('users').where('role', 'in', ['super-admin', 'admin', 'user', 'customer']).limit(500).get();
    return all.docs.filter((doc) => String(doc.data().email || '').trim().toLowerCase() === email);
}

async function listSuperAdmins() {
    const snap = await db.collection('users').where('role', '==', 'super-admin').get();
    return snap.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email || null,
        name: doc.data().name || null,
    }));
}

async function resolveAuthUid(email) {
    try {
        const user = await admin.auth().getUserByEmail(email);
        return user.uid;
    } catch (err) {
        if (err?.code === 'auth/user-not-found') return null;
        throw err;
    }
}

async function run() {
    console.log('Listing current super-admins…');
    const before = await listSuperAdmins();
    if (before.length === 0) {
        console.log('  (none found)');
    } else {
        for (const row of before) {
            console.log(`  - ${row.email || '(no email)'}  uid=${row.id}  name=${row.name || ''}`);
        }
    }

    const authUid = await resolveAuthUid(emailArg);
    const matches = await findUsersByEmail(emailArg);
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (matches.length > 0) {
        for (const doc of matches) {
            await doc.ref.set({
                email: emailArg,
                role: 'super-admin',
                status: 'active',
                updatedAt: now,
            }, { merge: true });
            console.log(`Updated users/${doc.id} → super-admin`);
        }
    } else if (authUid) {
        await db.collection('users').doc(authUid).set({
            email: emailArg,
            name: (await admin.auth().getUser(authUid)).displayName || emailArg.split('@')[0],
            role: 'super-admin',
            status: 'active',
            createdAt: now,
            updatedAt: now,
        }, { merge: true });
        console.log(`Created users/${authUid} → super-admin (from Firebase Auth)`);
    } else {
        // No Auth user yet — seed a doc keyed by a stable placeholder so the first Google login
        // can be linked by email. Prefer they sign in once with Google first.
        console.warn(`No Firebase Auth user for ${emailArg}.`);
        console.warn('Ask them to sign in once with Google on Mel-Agri, then re-run this script.');
        console.warn('Creating a pending users doc keyed by email for now…');
        await db.collection('users').doc(emailArg).set({
            email: emailArg,
            name: 'Pro Innovation Tech',
            role: 'super-admin',
            status: 'active',
            createdAt: now,
            updatedAt: now,
            pendingAuthLink: true,
        }, { merge: true });
        console.log(`Created users/${emailArg} → super-admin (pending Auth link)`);
    }

    // If Auth uid exists and an email-keyed pending doc also exists, keep Auth uid as source of truth
    if (authUid) {
        const pending = await db.collection('users').doc(emailArg).get();
        if (pending.exists && pending.id !== authUid) {
            await db.collection('users').doc(authUid).set({
                ...pending.data(),
                email: emailArg,
                role: 'super-admin',
                status: 'active',
                pendingAuthLink: admin.firestore.FieldValue.delete(),
                updatedAt: now,
            }, { merge: true });
            await pending.ref.delete();
            console.log(`Merged pending email doc into users/${authUid}`);
        }
    }

    console.log('\nSuper-admins after update:');
    const after = await listSuperAdmins();
    for (const row of after) {
        console.log(`  - ${row.email || '(no email)'}  uid=${row.id}  name=${row.name || ''}`);
    }
}

run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
