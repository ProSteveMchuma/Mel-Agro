const admin = require('firebase-admin');
const serviceAccount = require('c:/Users/sk/Downloads/melagri-firebase-adminsdk-fbsvc-5fca444862.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testRead() {
    console.log('Attempting to read from Firestore...');
    try {
        const testRef = db.collection('_test_connection').doc('test_doc');
        const doc = await testRef.get();

        if (!doc.exists) {
            console.log('No such document!');
        } else {
            console.log('Document data:', doc.data());
            console.log('Successfully read from Firestore!');
        }
    } catch (error) {
        console.error('Error reading from Firestore:', error);
    }
}

testRead();
