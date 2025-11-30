const admin = require('firebase-admin');
const serviceAccount = require('c:/Users/sk/Downloads/melagri-firebase-adminsdk-fbsvc-5fca444862.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const PRODUCTS = [
    // FERTILIZERS
    {
        name: "DAP Fertilizer (50kg)",
        price: 6500,
        category: "Fertilizers",
        image: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=1000&auto=format&fit=crop",
        rating: 4.8,
        reviews: 120,
        inStock: true,
        stock: 500,
        description: "Premium Diammonium Phosphate (DAP) fertilizer for planting. High phosphorus content promotes strong root development.",
        features: ["High Phosphorus", "Granular Form", "Suitable for all crops"]
    },
    {
        name: "CAN Fertilizer (50kg)",
        price: 4800,
        category: "Fertilizers",
        image: "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=1000&auto=format&fit=crop",
        rating: 4.7,
        reviews: 95,
        inStock: true,
        stock: 600,
        description: "Calcium Ammonium Nitrate (CAN) for top dressing. Enhances vegetative growth and crop quality.",
        features: ["Fast Acting", "Nitrogen Rich", "Neutral pH"]
    },
    {
        name: "NPK 17:17:17 (50kg)",
        price: 5200,
        category: "Fertilizers",
        image: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=1000&auto=format&fit=crop",
        rating: 4.6,
        reviews: 80,
        inStock: true,
        stock: 300,
        description: "Balanced NPK fertilizer for general crop nutrition. Ideal for coffee, tea, and vegetables.",
        features: ["Balanced Nutrition", "Boosts Yield", "Versatile"]
    },

    // SEEDS
    {
        name: "Hybrid Maize H614 (2kg)",
        price: 600,
        category: "Seeds",
        image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=1000&auto=format&fit=crop",
        rating: 4.9,
        reviews: 250,
        inStock: true,
        stock: 1000,
        description: "High-altitude hybrid maize variety. Resistant to lodging and common leaf diseases.",
        features: ["High Yield", "Drought Tolerant", "Disease Resistant"]
    },
    {
        name: "Certified Bean Seeds (1kg)",
        price: 450,
        category: "Seeds",
        image: "https://images.unsplash.com/photo-1591857177580-dc82b9e4e119?q=80&w=1000&auto=format&fit=crop",
        rating: 4.5,
        reviews: 60,
        inStock: true,
        stock: 400,
        description: "Rosecoco bean variety. Early maturing and high yielding.",
        features: ["Early Maturity", "High Protein", "Easy to Cook"]
    },
    {
        name: "Tomato Seeds - Anna F1 (10g)",
        price: 1200,
        category: "Seeds",
        image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=1000&auto=format&fit=crop",
        rating: 4.8,
        reviews: 150,
        inStock: true,
        stock: 200,
        description: "Determinate tomato hybrid. Excellent shelf life and disease resistance.",
        features: ["High Yield", "Firm Fruits", "Disease Resistant"]
    },

    // CROP PROTECTION
    {
        name: "Roundup Herbicide (1L)",
        price: 1500,
        category: "Crop Protection",
        image: "https://images.unsplash.com/photo-1615485925763-867862f80930?q=80&w=1000&auto=format&fit=crop",
        rating: 4.7,
        reviews: 300,
        inStock: true,
        stock: 150,
        description: "Non-selective systemic herbicide for weed control.",
        features: ["Systemic Action", "Broad Spectrum", "Effective"]
    },
    {
        name: "Duduthrin Insecticide (1L)",
        price: 1800,
        category: "Crop Protection",
        image: "https://images.unsplash.com/photo-1589923188900-85dae5233271?q=80&w=1000&auto=format&fit=crop",
        rating: 4.6,
        reviews: 110,
        inStock: true,
        stock: 100,
        description: "Broad-spectrum insecticide for control of aphids, thrips, and caterpillars.",
        features: ["Fast Knockdown", "Long Residual", "Versatile"]
    },

    // ANIMAL FEEDS
    {
        name: "Dairy Meal High Yield (70kg)",
        price: 3200,
        category: "Animal Feeds",
        image: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?q=80&w=1000&auto=format&fit=crop",
        rating: 4.8,
        reviews: 200,
        inStock: true,
        stock: 100,
        description: "Formulated for high-producing dairy cows. Increases milk production and quality.",
        features: ["High Protein", "Vitamin Enriched", "Palatable"]
    },
    {
        name: "Layers Mash (70kg)",
        price: 3400,
        category: "Animal Feeds",
        image: "https://images.unsplash.com/photo-1563205764-6e929f62334d?q=80&w=1000&auto=format&fit=crop",
        rating: 4.7,
        reviews: 180,
        inStock: true,
        stock: 120,
        description: "Complete feed for laying birds. Ensures strong shells and consistent laying.",
        features: ["Balanced Calcium", "Golden Yolk", "High Energy"]
    },

    // EQUIPMENT
    {
        name: "Knapsack Sprayer (16L)",
        price: 4500,
        category: "Equipment",
        image: "https://images.unsplash.com/photo-1589923188900-85dae5233271?q=80&w=1000&auto=format&fit=crop",
        rating: 4.9,
        reviews: 45,
        inStock: true,
        stock: 50,
        description: "Heavy-duty manual knapsack sprayer. Durable and easy to maintain.",
        features: ["Durable Tank", "Adjustable Nozzle", "Comfort Straps"]
    },
    {
        name: "Wheelbarrow (Heavy Duty)",
        price: 6500,
        category: "Equipment",
        image: "https://images.unsplash.com/photo-1589923188900-85dae5233271?q=80&w=1000&auto=format&fit=crop",
        rating: 4.5,
        reviews: 30,
        inStock: true,
        stock: 20,
        description: "Solid steel wheelbarrow for farm use. Puncture-proof tyre.",
        features: ["Steel Body", "Heavy Load", "Easy Grip"]
    }
];

const SETTINGS = {
    shipping: {
        zones: [
            { id: 'zone1', name: 'Nairobi Region', baseRate: 300, ratePerKg: 20 },
            { id: 'zone2', name: 'Central Region', baseRate: 500, ratePerKg: 30 },
            { id: 'zone3', name: 'Rift Valley', baseRate: 700, ratePerKg: 40 },
            { id: 'zone4', name: 'Western/Nyanza', baseRate: 900, ratePerKg: 50 },
            { id: 'zone5', name: 'Coast Region', baseRate: 1000, ratePerKg: 50 }
        ],
        freeShippingThreshold: 50000
    },
    site: {
        name: "MelAgro",
        contactEmail: "support@melagro.com",
        contactPhone: "+254 700 000 000"
    }
};

const USERS = [
    {
        uid: 'admin_user_id', // In real app, this comes from Auth. We'll simulate it.
        email: 'admin@melagro.com',
        name: 'MelAgro Admin',
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
        uid: 'test_user_id',
        email: 'test@example.com',
        name: 'Test Customer',
        role: 'user',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        addresses: [
            {
                id: 'addr1',
                name: 'Home',
                street: '123 Farm Road',
                city: 'Nairobi',
                zoneId: 'zone1',
                phone: '+254712345678'
            }
        ]
    }
];

async function seed() {
    console.log('🌱 Starting database seeding...');
    const batch = db.batch();

    // 1. Seed Products
    console.log('Seeding products...');
    for (const product of PRODUCTS) {
        const ref = db.collection('products').doc();
        batch.set(ref, {
            ...product,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // 2. Seed Settings
    console.log('Seeding settings...');
    const settingsRef = db.collection('settings').doc('general');
    batch.set(settingsRef, SETTINGS);

    // 3. Seed Users
    // Note: This only creates the Firestore profile. Auth users must be created separately or exist.
    console.log('Seeding user profiles...');
    for (const user of USERS) {
        const ref = db.collection('users').doc(user.email); // Using email as ID for easy lookup in this demo
        batch.set(ref, user);
    }

    await batch.commit();
    console.log('✅ Seeding complete!');
    console.log(`- ${PRODUCTS.length} Products created`);
    console.log(`- Settings configured`);
    console.log(`- ${USERS.length} User profiles created`);
}

seed().catch(console.error);
