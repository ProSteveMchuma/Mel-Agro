import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { requireUser } from '@/lib/auth-server';

export async function POST(request: Request) {
    try {
        const { guestToken } = await request.json();

        if (!guestToken) {
            return NextResponse.json(
                { success: false, message: 'guestToken is required' },
                { status: 400 }
            );
        }

        // 1. Get the authenticated target user (who is claiming the orders)
        const targetAuth = await requireUser(request);
        if (!targetAuth.ok || !targetAuth.uid) {
            return NextResponse.json(
                { success: false, message: targetAuth.message || 'Unauthorized' },
                { status: 401 }
            );
        }
        const targetUid = targetAuth.uid;

        // 2. Decode the guest ID token to find their guestUid
        let decodedGuest;
        try {
            decodedGuest = await adminAuth.verifyIdToken(guestToken);
        } catch (err: any) {
            return NextResponse.json(
                { success: false, message: `Invalid guest token: ${err.message}` },
                { status: 400 }
            );
        }

        const guestUid = decodedGuest.uid;

        // 3. Security check: Ensure the guest token belongs to an anonymous user
        // Firebase anonymous users have firebase.sign_in_provider === 'anonymous'
        const isAnonymous = decodedGuest.firebase?.sign_in_provider === 'anonymous';
        if (!isAnonymous) {
            return NextResponse.json(
                { success: false, message: 'Can only claim orders from guest/anonymous sessions' },
                { status: 400 }
            );
        }

        // Prevent self-claiming
        if (guestUid === targetUid) {
            return NextResponse.json(
                { success: true, count: 0, message: 'Source and target users are identical' }
            );
        }

        const db = adminDb;
        const batch = db.batch();
        let updateCount = 0;

        // 4. Find and migrate all orders belonging to the guestUid
        const ordersSnap = await db.collection('orders').where('userId', '==', guestUid).get();
        ordersSnap.docs.forEach(doc => {
            batch.update(doc.ref, { userId: targetUid });
            updateCount++;
        });

        // 5. Find and migrate all notifications belonging to the guestUid
        const notificationsSnap = await db.collection('notifications').where('userId', '==', guestUid).get();
        notificationsSnap.docs.forEach(doc => {
            batch.update(doc.ref, { userId: targetUid });
        });

        // 6. Find and migrate all messages belonging to the guestUid
        const messagesSnap = await db.collection('messages').where('userId', '==', guestUid).get();
        messagesSnap.docs.forEach(doc => {
            batch.update(doc.ref, { userId: targetUid });
        });

        // 7. Transfer guest loyalty points to the permanent user profile
        const guestUserSnap = await db.collection('users').doc(guestUid).get();
        if (guestUserSnap.exists) {
            const guestUserData = guestUserSnap.data();
            const guestPoints = guestUserData?.loyaltyPoints || 0;
            const targetUserSnap = await db.collection('users').doc(targetUid).get();
            const targetUserData = targetUserSnap.data() || {};
            const guestAffinity = guestUserData?.affinityIndex || {};
            const targetAffinity = targetUserData.affinityIndex || {};
            const mergedAffinity = Object.fromEntries(
                new Set([...Object.keys(guestAffinity), ...Object.keys(targetAffinity)]).values().map(category => [
                    category,
                    Number(guestAffinity[category] || 0) + Number(targetAffinity[category] || 0),
                ])
            );

            batch.set(db.collection('users').doc(targetUid), {
                loyaltyPoints: Number(targetUserData.loyaltyPoints || 0) + Number(guestPoints),
                affinityIndex: mergedAffinity,
                identityMergedAt: new Date().toISOString(),
                personalizationEnabled: targetUserData.personalizationEnabled !== false,
            }, { merge: true });

            // Clear transferable intelligence so a guest identity cannot be claimed twice.
            batch.set(db.collection('users').doc(guestUid), {
                loyaltyPoints: 0,
                affinityIndex: {},
                mergedInto: targetUid,
                mergedAt: new Date().toISOString(),
            }, { merge: true });
        }

        if (updateCount > 0 || guestUserSnap.exists) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            count: updateCount,
            message: `Successfully claimed ${updateCount} orders`
        });

    } catch (error: any) {
        console.error('Error claiming guest orders:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
