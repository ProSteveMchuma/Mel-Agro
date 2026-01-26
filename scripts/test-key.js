const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const rawKey = process.env.FIREBASE_PRIVATE_KEY;
if (!rawKey) {
    console.error('FIREBASE_PRIVATE_KEY not found in .env.local');
    process.exit(1);
}

const cleanedKey = rawKey.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '');

console.log('Key starts with:', cleanedKey.substring(0, 30));
console.log('Key ends with:', cleanedKey.substring(cleanedKey.length - 30));

try {
    const sign = crypto.createSign('SHA256');
    sign.update('test data');
    const signature = sign.sign(cleanedKey);
    console.log('Successfully signed test data!');
} catch (err) {
    console.error('Failed to sign with private key:');
    console.error(err);
}
