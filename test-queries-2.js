
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
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("Q1: Basic Fetch");
        const q1 = query(collection(db, "products"), limit(2));
        const snap1 = await getDocs(q1);
        console.log(`Q1 Success: ${snap1.size} docs`);

        console.log("Q2: OrderBy Name");
        try {
            const q2 = query(collection(db, "products"), orderBy("name"), limit(2));
            const snap2 = await getDocs(q2);
            console.log(`Q2 Success: ${snap2.size} docs`);
        } catch (e) {
            console.log(`Q2 Fail: ${e.message}`);
        }

        console.log("Q3: Where Category");
        try {
            const q3 = query(collection(db, "products"), where("category", "==", "Seeds"), limit(2));
            const snap3 = await getDocs(q3);
            console.log(`Q3 Success: ${snap3.size} docs`);
        } catch (e) {
            console.log(`Q3 Fail: ${e.message}`);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

testQuery();
