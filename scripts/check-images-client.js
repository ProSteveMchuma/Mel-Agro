const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function checkProductImages() {
    console.log("Checking for custom uploaded product images in Firestore...");
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const snap = await getDocs(collection(db, "products"));

        let found = 0;
        snap.forEach(doc => {
            const data = doc.data();
            const isUnsplash = data.image && (data.image.includes('unsplash.com') || data.image.includes('placehold.co'));

            if (!isUnsplash) {
                found++;
                console.log(`- Product: ${data.name}`);
                console.log(`  ID: ${doc.id}`);
                console.log(`  Image: ${data.image}`);
                console.log('---');
            }
        });

        console.log(`Found ${found} custom items.`);
        process.exit(0);
    } catch (error) {
        console.error("Failed to check products:", error);
        process.exit(1);
    }
}

checkProductImages();
