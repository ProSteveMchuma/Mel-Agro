import type { WriteBatch, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { orderPhoneKey, phoneQueryVariants } from '@/lib/phone-match';

export async function isClaimableGuestUid(uid: string): Promise<boolean> {
    if (!uid) return false;
    const snap = await adminDb.collection('users').doc(uid).get();
    if (snap.exists && snap.data()?.mergedInto) return true;

    try {
        const authUser = await adminAuth.getUser(uid);
        if (!authUser.providerData.length) return true;
        return authUser.providerData.every((provider) => provider.providerId === 'anonymous');
    } catch {
        // Auth user deleted / missing — still allow reclaim of orphaned orders.
        return true;
    }
}

async function transferGuestProfile(guestUid: string, targetUid: string, batch: WriteBatch) {
    const guestUserSnap = await adminDb.collection('users').doc(guestUid).get();
    if (!guestUserSnap.exists) return;

    const guestUserData = guestUserSnap.data() || {};
    if (guestUserData.mergedInto === targetUid && Number(guestUserData.loyaltyPoints || 0) === 0) {
        return;
    }

    const guestPoints = Number(guestUserData.loyaltyPoints) || 0;
    const targetUserSnap = await adminDb.collection('users').doc(targetUid).get();
    const targetUserData = targetUserSnap.data() || {};
    const guestAffinity = guestUserData.affinityIndex || {};
    const targetAffinity = targetUserData.affinityIndex || {};
    const mergedAffinity = Object.fromEntries(
        [...new Set([...Object.keys(guestAffinity), ...Object.keys(targetAffinity)])].map((category) => [
            category,
            Number(guestAffinity[category] || 0) + Number(targetAffinity[category] || 0),
        ]),
    );

    batch.set(adminDb.collection('users').doc(targetUid), {
        loyaltyPoints: Number(targetUserData.loyaltyPoints || 0) + guestPoints,
        affinityIndex: mergedAffinity,
        identityMergedAt: new Date().toISOString(),
        personalizationEnabled: targetUserData.personalizationEnabled !== false,
    }, { merge: true });

    batch.set(adminDb.collection('users').doc(guestUid), {
        loyaltyPoints: 0,
        affinityIndex: {},
        mergedInto: targetUid,
        mergedAt: new Date().toISOString(),
    }, { merge: true });
}

async function reassignSideCollections(guestUid: string, targetUid: string, batch: WriteBatch) {
    const notificationsSnap = await adminDb.collection('notifications').where('userId', '==', guestUid).get();
    for (const doc of notificationsSnap.docs) {
        batch.update(doc.ref, { userId: targetUid });
    }
    const messagesSnap = await adminDb.collection('messages').where('userId', '==', guestUid).get();
    for (const doc of messagesSnap.docs) {
        batch.update(doc.ref, { userId: targetUid });
    }
}

/** Claim all assets from an anonymous guest Auth session. */
export async function claimByGuestToken(args: {
    guestToken: string;
    targetUid: string;
}): Promise<{ count: number; message: string }> {
    let decodedGuest;
    try {
        decodedGuest = await adminAuth.verifyIdToken(args.guestToken);
    } catch (err: any) {
        throw Object.assign(new Error(`Invalid guest token: ${err.message}`), { status: 400 });
    }

    const guestUid = decodedGuest.uid;
    const isAnonymous = decodedGuest.firebase?.sign_in_provider === 'anonymous';
    if (!isAnonymous) {
        throw Object.assign(new Error('Can only claim orders from guest/anonymous sessions'), { status: 400 });
    }
    if (guestUid === args.targetUid) {
        return { count: 0, message: 'Source and target users are identical' };
    }

    const batch = adminDb.batch();
    const now = new Date().toISOString();
    const ordersSnap = await adminDb.collection('orders').where('userId', '==', guestUid).get();
    for (const doc of ordersSnap.docs) {
        batch.update(doc.ref, { userId: args.targetUid, claimedAt: now, claimedVia: 'guest' });
    }
    await reassignSideCollections(guestUid, args.targetUid, batch);
    await transferGuestProfile(guestUid, args.targetUid, batch);

    const guestUserSnap = await adminDb.collection('users').doc(guestUid).get();
    if (ordersSnap.size > 0 || guestUserSnap.exists) {
        await batch.commit();
    }

    return {
        count: ordersSnap.size,
        message: `Successfully claimed ${ordersSnap.size} orders`,
    };
}

/**
 * Reclaim orders whose phone matches the caller's verified Firebase phone,
 * but only when the previous owner is an anonymous/orphaned guest.
 */
export async function claimByVerifiedPhone(args: {
    targetUid: string;
}): Promise<{ count: number; message: string; guestUids: string[] }> {
    const authUser = await adminAuth.getUser(args.targetUid);
    const verifiedPhone = authUser.phoneNumber || '';
    if (!verifiedPhone) {
        throw Object.assign(
            new Error('Verify your phone with SMS first, then we can attach past guest orders.'),
            { status: 400 },
        );
    }

    const key = orderPhoneKey(verifiedPhone);
    const variants = phoneQueryVariants(verifiedPhone);
    if (!key || variants.length === 0) {
        throw Object.assign(new Error('Could not read a valid phone number on this account'), { status: 400 });
    }

    const found = new Map<string, QueryDocumentSnapshot>();

    const byKey = await adminDb.collection('orders').where('phoneKey', '==', key).limit(50).get();
    for (const doc of byKey.docs) found.set(doc.id, doc);

    const byPhone = await adminDb.collection('orders').where('phone', 'in', variants.slice(0, 10)).limit(50).get();
    for (const doc of byPhone.docs) found.set(doc.id, doc);

    const guestUids = new Set<string>();
    const batch = adminDb.batch();
    let count = 0;
    const now = new Date().toISOString();

    for (const doc of found.values()) {
        const data = doc.data() || {};
        const ownerUid = String(data.userId || '');
        if (!ownerUid || ownerUid === args.targetUid) continue;
        if (!(await isClaimableGuestUid(ownerUid))) continue;

        batch.update(doc.ref, {
            userId: args.targetUid,
            claimedAt: now,
            claimedVia: 'phone',
            previousUserId: ownerUid,
        });
        guestUids.add(ownerUid);
        count += 1;
    }

    for (const guestUid of guestUids) {
        await reassignSideCollections(guestUid, args.targetUid, batch);
        await transferGuestProfile(guestUid, args.targetUid, batch);
    }

    if (count > 0 || guestUids.size > 0) {
        await batch.commit();
    }

    await adminDb.collection('users').doc(args.targetUid).set({
        phone: verifiedPhone,
        phoneKey: key,
        updatedAt: now,
    }, { merge: true });

    return {
        count,
        guestUids: [...guestUids],
        message: count
            ? `Attached ${count} past order${count === 1 ? '' : 's'} to your phone`
            : 'No guest orders found for this phone',
    };
}
