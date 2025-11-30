const admin = require('firebase-admin');
const serviceAccount = require('c:/Users/sk/Downloads/melagri-firebase-adminsdk-fbsvc-5fca444862.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testWrite() {
    console.log('Attempting to write to Firestore...');
    try {
        const testRef = db.collection('_test_connection').doc('test_doc');
        const data = {
            message: "Hello from Antigravity!",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            testId: Math.floor(Math.random() * 1000)
        };

        await testRef.set(data);
        console.log('Successfully wrote to Firestore!');
        console.log('Collection: _test_connection');
        console.log('Document ID: test_doc');
        console.log('Data:', data);
    } catch (error) {
        console.error('Error writing to Firestore:', error);
    }
}

testWrite();
