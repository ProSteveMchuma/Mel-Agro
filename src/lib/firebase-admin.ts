import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        // Robust private key parsing to handle different environment variable formats
        // (e.g. escaped newlines, literal newlines, or wrapping quotes)
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
            // 1. Basic cleanup: remove quotes and normalize literal \n
            // Handle cases where the key might be double-quoted or have escaped backslashes
            privateKey = privateKey.replace(/^["']|["']$/g, '')
                                   .replace(/\\n/g, '\n')
                                   .replace(/\\\\n/g, '\n');

            // 2. Identify and re-wrap the PEM content
            const header = '-----BEGIN PRIVATE KEY-----';
            const footer = '-----END PRIVATE KEY-----';

            if (privateKey.includes(header) && privateKey.includes(footer)) {
                // Extract just the content between header and footer
                const parts = privateKey.split(header);
                const contentWithFooter = parts[parts.length - 1];
                const contentParts = contentWithFooter.split(footer);
                const rawContent = contentParts[0].replace(/\s+/g, '');

                // Re-wrap at 64 characters for standard PEM format
                const wrapped = rawContent.match(/.{1,64}/g)?.join('\n');
                if (wrapped) {
                    privateKey = `${header}\n${wrapped}\n${footer}\n`;
                }
            }
        }

        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        if (projectId && clientEmail && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
        } else {
            console.warn('Firebase Admin missing credentials, skipping initialization');
        }
    } catch (error) {
        console.error('Firebase admin initialization error:', error);
    }
}

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
    get(target, prop, receiver) {
        if (!admin.apps.length) {
            throw new Error("Firebase Admin app is not initialized. Check your environment variables.");
        }
        const db = admin.firestore();
        const value = Reflect.get(db, prop, receiver);
        return typeof value === 'function' ? value.bind(db) : value;
    }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
    get(target, prop, receiver) {
        if (!admin.apps.length) {
            throw new Error("Firebase Admin app is not initialized. Check your environment variables.");
        }
        const auth = admin.auth();
        const value = Reflect.get(auth, prop, receiver);
        return typeof value === 'function' ? value.bind(auth) : value;
    }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
    get(target, prop, receiver) {
        if (!admin.apps.length) {
            throw new Error("Firebase Admin app is not initialized. Check your environment variables.");
        }
        const storage = admin.storage();
        const value = Reflect.get(storage, prop, receiver);
        return typeof value === 'function' ? value.bind(storage) : value;
    }
});

