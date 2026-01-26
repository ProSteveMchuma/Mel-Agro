const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
let privateKeyLine = lines.find(l => l.startsWith('FIREBASE_PRIVATE_KEY='));
let key = privateKeyLine.split('=')[1].trim();
key = key.replace(/^["']|["']$/g, '');
const base64Part = key.replace(/\\n/g, '').replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');

console.log('Base64 length:', base64Part.length);
try {
    const buffer = Buffer.from(base64Part, 'base64');
    console.log('Decoded length:', buffer.length);
    console.log('Decoded start (hex):', buffer.slice(0, 10).toString('hex'));
} catch (err) {
    console.log('Base64 decode FAILED:');
    console.log(err);
}
