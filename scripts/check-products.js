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

async function checkProducts() {
    console.log("Fetching products from Firestore...");
    const snapshot = await db.collection('products').get();

    if (snapshot.empty) {
        console.log("No products found.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- Product: ${data.name}`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  Image URL: ${data.image}`);
        console.log(`  In Stock: ${data.inStock}`);
        console.log('---');
    });
}

checkProducts().catch(console.error);
