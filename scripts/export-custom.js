const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
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
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const snap = await getDocs(collection(db, "products"));

        let output = "";
        snap.forEach(doc => {
            const data = doc.data();
            const isUnsplash = data.image && (data.image.includes('unsplash.com') || data.image.includes('placehold.co'));

            if (!isUnsplash) {
                output += `PRODUCT: ${data.name}\nID: ${doc.id}\nIMAGE: ${data.image}\nCATEGORY: ${data.category}\n---\n`;
            }
        });

        fs.writeFileSync('custom_products.txt', output);
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

checkProductImages();
