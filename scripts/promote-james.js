const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    const email = 'james.wambua@makamithi.com';
    console.log('Target Email:', email);

    // Check users collection
    const snapshot = await db.collection('users').where('email', '==', email).get();

    if (snapshot.empty) {
        console.log('No user found in "users" collection. Creating one...');
        await db.collection('users').doc(email).set({
            email: email,
            name: 'James Wambua',
            role: 'admin',
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Created user document with admin role.');
    } else {
        const batch = db.batch();
        snapshot.forEach(doc => {
            console.log('Found user:', doc.id);
            batch.update(doc.ref, {
                role: 'admin',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        await batch.commit();
        console.log('Updated existing user(s) to admin role.');
    }
}

run().then(() => {
    console.log('Done.');
    process.exit(0);
}).catch(err => {
    console.error('Error detail:', err);
    process.exit(1);
});
