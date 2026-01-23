const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAndPromote(email) {
    console.log(`Checking status for: ${email}`);
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
        console.log('User not found in Firestore. Creating new admin entry.');
        await usersRef.doc(email).set({
            email,
            role: 'admin',
            status: 'active',
            name: 'James Wambua',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Admin entry created.');
    } else {
        snapshot.forEach(async (doc) => {
            console.log(`Current data for ${doc.id}:`, doc.data());
            await doc.ref.update({ role: 'admin' });
            console.log('Role updated to admin.');
        });
    }
}

checkAndPromote('james.wambua@makamithi.com')
    .then(() => {
        console.log('Process finished.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
