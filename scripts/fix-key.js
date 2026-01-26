const crypto = require('crypto');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
let privateKeyLine = lines.find(l => l.startsWith('FIREBASE_PRIVATE_KEY='));
let key = privateKeyLine.split('=')[1].trim();
key = key.replace(/^["']|["']$/g, '');
const cleanedKey = key.replace(/\\n/g, '\n');

function fixKey(rawKey) {
    // 1. Remove markers
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    let content = rawKey.replace(header, '').replace(footer, '').replace(/\s+/g, '');

    // 2. Re-wrap at 64 chars
    const wrapped = content.match(/.{1,64}/g).join('\n');

    return `${header}\n${wrapped}\n${footer}\n`;
}

const fixedKey = fixKey(cleanedKey);

console.log('Testing FIXED key...');
try {
    crypto.createPrivateKey(fixedKey);
    console.log('SUCCESS: createPrivateKey worked with fixed key!');
    console.log('--- FIXED KEY ---');
    console.log(fixedKey);
} catch (err) {
    console.log('FAILURE: even fixing didn\'t work.');
    console.log(err.message);
}
