const admin = require('firebase-admin');

const serviceAccount = {
    projectId: "melagri",
    clientEmail: "firebase-adminsdk-fbsvc@melagri.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDwaIHBGQpIxfsi\nMdcv+UicOMsZ3pYqGrJulOSFaQLVN0E+k4HOIQfCheB0F4DIsSe331MttOgatUns\n3cCEBomp9cHLMUe3sEIpjkIwdRocdtRHa/tfrCIbPkbjVULIY3p577HNSsYkndGh\nWAI2q/j71EhgTgUzOBUY6Di7L0jBrVEisPZy6dVhief5+rp89Ra+VVU1ng7//bNv\nE0VPrS1gkTk9j4kSM62yxOs5Gdex9/kRQ1vWKOj+P+sIwIjy5OET57S5IJQqTQHu\npS+YvuMY/mAZxU/DXjnRo72D2BDyJms8lBIUxgrzkJkGOdPjDmNhyCB/kYgQdhDD\nCSNrWSpzAgMBAAECggEAZYjN3F8V/9xWD4AbUTCooQo/hUKEC25RE/EgftP2FVUL\n4kDsXsGGhHqEbKOMibaAfuD8QV6ZdMZCXZ7ecyRLuhOIcKf0kTkJCIIDpHGgwIrT\nZwLNHQAXO4hW6iaVWQrirGM2pezBuK9K3SjNboe9Vaa3lqz89z/lcSqK40u6H8mg\nzW2iw6M/CwcJR5v0UwpC4V9jiIe2OL+CfSBShztZRXa/aoibDsgnjtqBD5mxDgLH\njy0w588HP7427swQF1vrKqIWfrZ7MstCLBaPfmHk8cwqhA5iF7N0bF4pmYo4froI\nkADCJmSlzN3PzR2JEZBSIxuFgltJXVPoHMEIqHtouQKBgQD+t1vOjKkPJPBch65Q\nMOAZVA7IHpVPp3KXjepbe64IUG89C+CT5aVBKXMXWXi3r0pkB4qVIyzJFhU47iK1\n6Djkodm0NmidrQIMHFqPEgWeLAr4jn3nQevoSDN6ivUsk198Ttps9QsIC4Aui562\nAfZ8wzV74h0GGqfohIkN8rkofQKBgQDxnrAK/CBlnstktMcAKDDd5fe+AhLsa7NI\nrN5L6q0TIZNznPYKCTSDKxnC++7rrtkAHN6J40Fjl6aiQrEldsEWU/v0y0t7w2xE\nC5v+T364gwWyJL8m951THrzoTt/4Ft8PnSVYz1msnA9yp9bRDD69XYwK+UCRh5Vy\nvOKSTHYBrwKBgQCl4VNwmDohGrVODS6AGtRWql9WBFTIowwFlu5g1ZLo5zkKUInY\nx11vqkbBlgr/1LBlpGOj7FxmOHNpt+vy+2DRxHW63xQSW3FR4cU4F0yBTb13UZS8\n3jl79ElSLNyuQuuUUOX+vzaH7rVzmompjm2vopFaNE8igomG64k2BDSBIQKBgQDi\nCD7N9/Fiv3us2UU1C2Qzodfyg8QqMdLFkRpgUMjaldV4GYU9/ECI2MA/3Sk0iBxu\n85Ln0ZYxUgRL1TIdRwv5FFYnOiuCO15EBcxHyxxUBhZFAgVksc4WnTHB7U+uqc7A\nr5TpkQhl5pS5APSAGgFza1kARw61Ve5kKPmYPTlD9wKBgQCNOR+bj4J/ROmueoH3\nwldNg9uPQlJ5y3xTBu9dE327faKp6shaORwC0huoTzmnRwmSbc6joE7bw5YAXH4G\nuYOlUr9tzUOxZncN8S76g2JzA8JhjfKw2u2BZN3Pva9QUOr0t8znYxkD5rqyKZY1\n87adstUPRmBEDrgFy8J+Snak6A==\n-----END PRIVATE KEY-----\n"
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    const email = 'james.wambua@makamithi.com';
    const snapshot = await db.collection('users').where('email', '==', email).get();

    if (snapshot.empty) {
        console.log('No user found, creating...');
        await db.collection('users').doc(email).set({
            email,
            role: 'admin',
            name: 'James Wambua',
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } else {
        console.log('User found, updating...');
        for (const doc of snapshot.docs) {
            await doc.ref.update({ role: 'admin' });
        }
    }
    console.log('Done.');
}

run().catch(console.error);
