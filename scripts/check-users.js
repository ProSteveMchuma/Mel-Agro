const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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

async function checkUsers() {
    console.log("Fetching users from Firestore...");
    const snapshot = await db.collection('users').get();

    if (snapshot.empty) {
        console.log("No users found.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- User: ${data.name || 'N/A'}`);
        console.log(`  Email: ${data.email}`);
        console.log(`  Role: ${data.role}`);
        console.log(`  ID: ${doc.id}`);
        console.log('---');
    });
}

checkUsers().catch(console.error);
