const fs = require('fs');
const serviceAccount = require('c:/Users/sk/Downloads/melagri-firebase-adminsdk-fbsvc-5fca444862.json');

const envContent = `
NEXT_PUBLIC_FIREBASE_API_KEY=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${serviceAccount.project_id}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}
NEXT_PUBLIC_FIREBASE_APP_ID=${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}

# Admin SDK
FIREBASE_PROJECT_ID=${serviceAccount.project_id}
FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}
FIREBASE_PRIVATE_KEY="${serviceAccount.private_key.replace(/\n/g, '\\n')}"
`;

// Append or overwrite? Let's overwrite to be safe, but we might lose existing client keys if I don't read them first.
// Actually, I don't have access to existing keys easily if I can't read .env.local.
// But I can read .env.local if it exists in the workspace!
// Let's try to read it first.

try {
    const existing = fs.readFileSync('.env.local', 'utf8');
    console.log("Existing .env.local found.");

    // Append Admin keys if not present
    let newContent = existing;
    if (!newContent.includes('FIREBASE_PRIVATE_KEY')) {
        newContent += `\n\n# Admin SDK\nFIREBASE_PROJECT_ID=${serviceAccount.project_id}\nFIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}\nFIREBASE_PRIVATE_KEY="${serviceAccount.private_key.replace(/\n/g, '\\n')}"\n`;
    }
    fs.writeFileSync('.env.local', newContent);
    console.log("Updated .env.local");
} catch (e) {
    console.log("Creating new .env.local");
    fs.writeFileSync('.env.local', envContent);
}
