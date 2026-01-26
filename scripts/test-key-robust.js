const fs = require('fs');
const crypto = require('crypto');

async function test() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    let privateKeyLine = lines.find(l => l.startsWith('FIREBASE_PRIVATE_KEY='));

    if (!privateKeyLine) {
        console.log('FIREBASE_PRIVATE_KEY line not found');
        return;
    }

    let key = privateKeyLine.split('=')[1].trim();
    // Remove surrounding quotes if they exist
    key = key.replace(/^["']|["']$/g, '');
    // Handle escaped newlines
    const cleanedKey = key.replace(/\\n/g, '\n');

    console.log('--- CLEANED KEY PREVIEW ---');
    console.log(cleanedKey.substring(0, 40));
    console.log('...');
    console.log(cleanedKey.substring(cleanedKey.length - 40));
    console.log('---------------------------');

    try {
        const sign = crypto.createSign('SHA256');
        sign.update('test data');
        sign.sign(cleanedKey);
        console.log('SUCCESS: Crypto.sign worked with this key.');
    } catch (err) {
        console.log('FAILURE: Crypto.sign failed.');
        console.log(err);
    }
}

test();
