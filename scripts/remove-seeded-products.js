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

// Names of products to remove (from seed-admin.js)
const SEEDED_PRODUCT_NAMES = [
    "DAP Fertilizer (50kg)",
    "CAN Fertilizer (50kg)",
    "NPK 17:17:17 (50kg)",
    "Hybrid Maize H614 (2kg)",
    "Certified Bean Seeds (1kg)",
    "Tomato Seeds - Anna F1 (10g)",
    "Roundup Herbicide (1L)",
    "Duduthrin Insecticide (1L)",
    "Dairy Meal High Yield (70kg)",
    "Layers Mash (70kg)",
    "Knapsack Sprayer (16L)",
    "Wheelbarrow (Heavy Duty)"
];

async function removeSeededProducts() {
    console.log("🗑️ Removing seeded products from Firestore...");
    const snapshot = await db.collection('products').get();

    let deletedCount = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const p = doc.data();
        // Delete if the name is in our seeded list OR if it has a suspicious ID like "2" 
        // OR if it has no name (safeguard)
        if (SEEDED_PRODUCT_NAMES.includes(p.name) || doc.id === "2" || !p.name) {
            batch.delete(doc.ref);
            console.log(`- Scheduled for deletion: ${p.name || 'UNNAMED'} (${doc.id})`);
            deletedCount++;
        }
    });

    if (deletedCount > 0) {
        await batch.commit();
        console.log(`✅ Successfully deleted ${deletedCount} seeded products.`);
    } else {
        console.log("No seeded products found to delete.");
    }
}

removeSeededProducts().catch(console.error);
