import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// You should set these env vars in .env.local
// For the service account, we'll try to load directly from the file for this local dev environment
// to avoid env var parsing issues with the private key.
let serviceAccount;
try {
    serviceAccount = require('c:/Users/sk/Downloads/melagri-firebase-adminsdk-fbsvc-5fca444862.json');
} catch (e) {
    // Fallback to env vars if file not found (e.g. in production)
    serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
}

const app = !getApps().length
    ? initializeApp({
        credential: cert(serviceAccount),
    })
    : getApp();

const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

export { adminAuth, adminDb };
