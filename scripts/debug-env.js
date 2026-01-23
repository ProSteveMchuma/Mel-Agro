const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('Private Key Length:', process.env.FIREBASE_PRIVATE_KEY?.length);
console.log('Private Key start:', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30));
