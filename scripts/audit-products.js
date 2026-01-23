const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

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

async function auditProducts() {
    let output = "🔍 Auditing products in Firestore...\n";
    const snapshot = await db.collection('products').get();

    output += `Total Products: ${snapshot.size}\n`;

    const categories = new Set();
    const brands = new Set();
    const missingFields = [];

    snapshot.forEach(doc => {
        const p = doc.data();
        if (p.category) categories.add(p.category);
        if (p.brand) brands.add(p.brand);

        const required = ['name', 'price', 'category', 'image'];
        const missing = required.filter(f => !p[f]);
        if (missing.length > 0) {
            missingFields.push({ id: doc.id, name: p.name || 'UNNAMED', missing });
        }
    });

    console.log("📁 Categories found:", Array.from(categories));
    console.log("🏷️ Brands found:", Array.from(brands));

    if (missingFields.length > 0) {
        console.log("\n⚠️ Products with missing essential fields:");
        missingFields.forEach(f => {
            console.log(`- ${f.name} (ID: ${f.id}): missing [${f.missing.join(', ')}]`);
        });
    } else {
        console.log("\n✅ All products have essential fields.");
    }

    fs.writeFileSync('product-audit.txt', output + "\nAudit complete.");
    console.log("Audit complete.");
}

auditProducts().catch(console.error);
