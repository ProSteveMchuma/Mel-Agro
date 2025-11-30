const admin = require('firebase-admin');
const serviceAccount = require('c:/Users/sk/Downloads/melagri-firebase-adminsdk-fbsvc-5fca444862.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

async function resetDatabase() {
    console.log('⚠ WARNING: This will delete ALL data in the database.');
    console.log('Starting database reset...');

    const collections = ['products', 'users', 'orders', 'settings', 'reviews', 'wishlist', '_test_connection'];

    for (const collectionName of collections) {
        console.log(`Deleting collection: ${collectionName}...`);
        await deleteCollection(collectionName, 50);
        console.log(`Deleted ${collectionName}.`);
    }

    console.log('✅ Database reset complete.');
}

resetDatabase().catch(console.error);
