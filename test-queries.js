
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query, where, orderBy } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testQuery() {
    console.log("Testing Firestore queries...");
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("\n1. Fetching first 5 products (no filters):");
        const q1 = query(collection(db, "products"), limit(5));
        const snap1 = await getDocs(q1);
        snap1.forEach(doc => {
            console.log(`- ID: ${doc.id}, Name: ${doc.data().name}, Category: ${doc.data().category}`);
        });

        console.log("\n2. Fetching with orderBy('name'):");
        try {
            const q2 = query(collection(db, "products"), orderBy("name"), limit(5));
            const snap2 = await getDocs(q2);
            console.log(`- Success: Found ${snap2.size} products.`);
        } catch (e) {
            console.error("- Error with orderBy('name'):", e.message);
        }

        console.log("\n3. Fetching with category filter ('Seeds'):");
        try {
            const q3 = query(collection(db, "products"), where("category", "==", "Seeds"), limit(5));
            const snap3 = await getDocs(q3);
            console.log(`- Success: Found ${snap3.size} products.`);
        } catch (e) {
            console.error("- Error with category filter:", e.message);
        }

        console.log("\n4. Fetching with category filter + orderBy('name') (Requires Index):");
        try {
            const q4 = query(collection(db, "products"), where("category", "==", "Seeds"), orderBy("name"), limit(5));
            const snap4 = await getDocs(q4);
            console.log(`- Success: Found ${snap4.size} products.`);
        } catch (e) {
            console.error("- Error (Likely missing index):", e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

testQuery();
