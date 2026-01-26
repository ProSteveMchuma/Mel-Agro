import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        // Robust private key parsing to handle different environment variable formats
        // (e.g. escaped newlines, literal newlines, or wrapping quotes)
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
            // 1. Remove surrounding quotes and handle literal \n
            // Also strip any non-printable characters that might have sneaked in during copy-paste
            privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').replace(/[^\x20-\x7E\n]/g, '');

            // 2. If it still looks like a single line but has headers, it might be corrupted. 
            // Re-format to ensure it follows the PEM standard (64 chars per line)
            const header = '-----BEGIN PRIVATE KEY-----';
            const footer = '-----END PRIVATE KEY-----';

            if (privateKey.includes(header) && privateKey.includes(footer)) {
                let content = privateKey.replace(header, '').replace(footer, '').replace(/\s+/g, '');
                // Re-wrap content at 64 characters
                const wrappedContent = content.match(/.{1,64}/g)?.join('\n');
                if (wrappedContent) {
                    privateKey = `${header}\n${wrappedContent}\n${footer}\n`;
                }
            }
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    } catch (error) {
        console.error('Firebase admin initialization error:', error);
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
