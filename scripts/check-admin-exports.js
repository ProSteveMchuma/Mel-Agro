const admin = require('firebase-admin');

console.log('Default export:', typeof admin);
console.log('Is firestore on default export?', !!admin.firestore);
if (admin.firestore) {
    console.log('Is Timestamp on firestore?', !!admin.firestore.Timestamp);
}

const adminNamespace = require('firebase-admin');
console.log('Namespace export firestore?', !!adminNamespace.firestore);
