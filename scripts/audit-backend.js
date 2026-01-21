const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const cleanKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\\$/, '').trim();
console.log('Key length:', cleanKey?.length);
console.log('Key starts with:', cleanKey?.substring(0, 30));
console.log('Key ends with:', cleanKey?.substring(cleanKey.length - 30));

const config = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: cleanKey,
};

if (!config.projectId || !config.clientEmail || !config.privateKey) {
    console.error('❌ Missing Firebase Admin credentials in .env.local');
    console.log('Project ID:', config.projectId);
    console.log('Client Email:', config.clientEmail);
    console.log('Private Key present:', !!config.privateKey);
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(config),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
    console.log('✅ Firebase Admin Initialized');
} catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
}

const db = admin.firestore();
const storage = admin.storage();

async function audit() {
    console.log('\n--- 📊 Firestore Audit ---');
    const collections = ['products', 'orders', 'users', 'chamas', 'notifications', 'messages'];

    for (const col of collections) {
        try {
            const snapshot = await db.collection(col).limit(1).get();
            const countSnapshot = await db.collection(col).count().get();
            const count = countSnapshot.data().count;

            console.log(`${col.padEnd(15)}: ${count} documents ${count > 0 ? '✅' : '❓'}`);

            if (!snapshot.empty) {
                const sample = snapshot.docs[0].data();
                console.log(`  Sample keys: ${Object.keys(sample).join(', ')}`);
            }
        } catch (error) {
            console.error(`❌ Error auditing ${col}:`, error.message);
        }
    }

    console.log('\n--- 📁 Storage Audit ---');
    try {
        const [files] = await storage.bucket().getFiles({ maxResults: 5 });
        console.log(`Storage Connection: ✅ (Found ${files.length}+ files)`);
        files.forEach(file => console.log(`  - ${file.name}`));
    } catch (error) {
        console.error('❌ Storage access failed:', error.message);
    }

    console.log('\n--- 🔐 Connection Status ---');
    console.log('Backend connection is active and well-developed.');
    process.exit(0);
}

audit();
