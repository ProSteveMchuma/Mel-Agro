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
    key = key.replace(/^["']|["']$/g, '');
    const cleanedKey = key.replace(/\\n/g, '\n');

    console.log('Testing key with crypto.createPrivateKey...');
    try {
        crypto.createPrivateKey(cleanedKey);
        console.log('SUCCESS: createPrivateKey worked.');
    } catch (err) {
        console.log('FAILURE: createPrivateKey failed.');
        console.log(err.message);

        console.log('Attempting cleanup (removing all internal newlines/spaces)...');
        const header = '-----BEGIN PRIVATE KEY-----';
        const footer = '-----END PRIVATE KEY-----';
        let content = cleanedKey.replace(header, '').replace(footer, '').replace(/\s+/g, '');
        const refactoredKey = `${header}\n${content}\n${footer}`;

        try {
            crypto.createPrivateKey(refactoredKey);
            console.log('SUCCESS: createPrivateKey worked after reformatting!');
        } catch (err2) {
            console.log('FAILURE: Reformatting did not help.');
            console.log(err2.message);
        }
    }
}

test();
