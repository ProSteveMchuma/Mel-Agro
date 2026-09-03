const admin = require('firebase-admin');

// Initialize Firebase Admin from the environment (never a hard-coded path).
// Supported configurations, in priority order:
//   1. FIRESTORE_EMULATOR_HOST set  -> connect to the local emulator (project id only)
//   2. GOOGLE_APPLICATION_CREDENTIALS -> service-account JSON path (admin.credential.applicationDefault)
//   3. FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY -> inline cert
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

    if (process.env.FIRESTORE_EMULATOR_HOST) {
        admin.initializeApp({ projectId: projectId || 'demo-melagri' });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else if (projectId && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    } else {
        console.error('Missing Firebase credentials. Set FIRESTORE_EMULATOR_HOST for the emulator, or GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.');
        process.exit(1);
    }
}

const db = admin.firestore();

const products = [
    {
        id: 1,
        name: "DAP Fertilizer",
        price: 3500,
        category: "Fertilizers",
        image: "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=1000&auto=format&fit=crop",
        rating: 4.8,
        reviews: 120,
        inStock: true,
        description: "High-quality Diammonium Phosphate fertilizer for planting."
    },
    {
        id: 2,
        name: "CAN Fertilizer",
        price: 2800,
        category: "Fertilizers",
        image: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=1000&auto=format&fit=crop",
        rating: 4.5,
        reviews: 85,
        inStock: true,
        description: "Calcium Ammonium Nitrate fertilizer for top dressing."
    },
    {
        id: 3,
        name: "Hybrid Maize Seeds",
        price: 500,
        category: "Seeds",
        image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=1000&auto=format&fit=crop",
        rating: 4.7,
        reviews: 200,
        inStock: true,
        description: "High-yield hybrid maize seeds suitable for various climates."
    },
    {
        id: 4,
        name: "Vegetable Seeds Pack",
        price: 150,
        category: "Seeds",
        image: "https://images.unsplash.com/photo-1591857177580-dc82b9e4e119?q=80&w=1000&auto=format&fit=crop",
        rating: 4.6,
        reviews: 50,
        inStock: true,
        description: "Assorted vegetable seeds including kales, spinach, and tomatoes."
    },
    {
        id: 5,
        name: "Pest Control Spray",
        price: 1200,
        category: "Pesticides",
        image: "https://images.unsplash.com/photo-1615485925763-867862f80930?q=80&w=1000&auto=format&fit=crop",
        rating: 4.4,
        reviews: 90,
        inStock: true,
        description: "Effective broad-spectrum pesticide for common crop pests."
    },
    {
        id: 6,
        name: "Knapsack Sprayer",
        price: 4500,
        category: "Equipment",
        image: "https://images.unsplash.com/photo-1589923188900-85dae5233271?q=80&w=1000&auto=format&fit=crop",
        rating: 4.9,
        reviews: 45,
        inStock: true,
        description: "Durable 16L knapsack sprayer for easy application of agrochemicals."
    },
    {
        id: 7,
        name: "Dairy Meal",
        price: 2800,
        category: "Animal Feeds",
        image: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?q=80&w=1000&auto=format&fit=crop",
        rating: 4.7,
        reviews: 110,
        inStock: true,
        description: "Nutrient-rich dairy meal to boost milk production."
    },
    {
        id: 8,
        name: "Chicken Feeds (Layers)",
        price: 3200,
        category: "Animal Feeds",
        image: "https://images.unsplash.com/photo-1563205764-6e929f62334d?q=80&w=1000&auto=format&fit=crop",
        rating: 4.5,
        reviews: 75,
        inStock: true,
        description: "Balanced feed for laying hens to ensure high egg production."
    }
];

async function seedProducts() {
    console.log('Starting product seeding...');
    const batch = db.batch();
    const collectionRef = db.collection('products');

    // Optional: Delete existing products first to avoid duplicates if running multiple times
    // For now, we'll just overwrite/add based on ID if we used set(), but we'll use add() or set() with specific IDs.
    // Let's use the ID from the mock data as the document ID for consistency.

    for (const product of products) {
        const { id, ...productData } = product;
        const docRef = collectionRef.doc(String(id)); // Use ID as doc ID
        batch.set(docRef, productData);
    }

    try {
        await batch.commit();
        console.log(`Successfully seeded ${products.length} products.`);
    } catch (error) {
        console.error('Error seeding products:', error);
    }
}

seedProducts();
