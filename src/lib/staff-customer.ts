import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import { getOrCreateUserByPhone } from '@/lib/phone-otp-server';
import { normalizeKenyanPhone } from '@/lib/account-upgrade';
import { orderPhoneKey, phoneQueryVariants } from '@/lib/phone-match';
import { customerCreateBlock, customersMatchingPhone } from '@/lib/whatsapp-order';

export type StaffCustomer = {
    id: string;
    name: string;
    email: string;
    phone: string;
    county: string;
    loyaltyPoints: number;
    status: string;
    role: string;
    savedAddresses: Array<Record<string, unknown>>;
};

const SCAN_LIMIT = 500;

function toStaffCustomer(id: string, data: Record<string, unknown> | undefined): StaffCustomer {
    const source = data || {};
    return {
        id,
        name: String(source.name || ''),
        email: String(source.email || ''),
        phone: String(source.phone || ''),
        county: String(source.county || ''),
        loyaltyPoints: Math.max(0, Number(source.loyaltyPoints) || 0),
        status: String(source.status || 'active'),
        role: String(source.role || 'user'),
        savedAddresses: Array.isArray(source.savedAddresses)
            ? source.savedAddresses.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
            : [],
    };
}

export async function findCustomersByPhone(rawPhone: string): Promise<StaffCustomer[]> {
    const phone = normalizeKenyanPhone(rawPhone);
    const key = orderPhoneKey(phone);
    const byId = new Map<string, StaffCustomer>();

    const variants = phoneQueryVariants(phone).slice(0, 10);
    const [phoneQuery, orderQuery, scanned] = await Promise.all([
        adminDb.collection('users').where('phone', 'in', variants).limit(10).get(),
        adminDb.collection('orders').where('phoneKey', '==', key).limit(15).get(),
        adminDb.collection('users').orderBy('__name__').limit(SCAN_LIMIT).get(),
    ]);

    for (const doc of phoneQuery.docs) {
        byId.set(doc.id, toStaffCustomer(doc.id, doc.data()));
    }

    const scannedMatches = customersMatchingPhone(
        scanned.docs.map((doc) => ({ id: doc.id, phone: String(doc.data().phone || ''), status: String(doc.data().status || '') })),
        phone,
    );
    for (const match of scannedMatches) {
        if (byId.has(match.id)) continue;
        const doc = scanned.docs.find((entry) => entry.id === match.id);
        if (doc) byId.set(doc.id, toStaffCustomer(doc.id, doc.data()));
    }

    const missingFromOrders = [...new Set(orderQuery.docs.map((doc) => String(doc.data().userId || '')).filter(Boolean))]
        .filter((id) => !byId.has(id));
    if (missingFromOrders.length > 0) {
        const refs = missingFromOrders.slice(0, 10).map((id) => adminDb.collection('users').doc(id));
        const snaps = await adminDb.getAll(...refs);
        for (const snap of snaps) {
            if (!snap.exists) continue;
            const customer = toStaffCustomer(snap.id, snap.data());
            byId.set(snap.id, customer.phone ? customer : { ...customer, phone });
        }
    }

    return [...byId.values()].slice(0, 8);
}

export async function createStaffCustomer(rawPhone: string, rawName: string): Promise<
    | { ok: true; created: boolean; customers: StaffCustomer[] }
    | { ok: false; status: number; message: string }
> {
    let phone: string;
    try {
        phone = normalizeKenyanPhone(rawPhone);
    } catch {
        return { ok: false, status: 400, message: 'Enter a valid Kenyan phone number (e.g. 0712 345 678).' };
    }
    const name = rawName.trim();
    if (name.length < 2 || name.length > 80) {
        return { ok: false, status: 400, message: 'Enter the customer name from WhatsApp.' };
    }

    const existing = await findCustomersByPhone(phone);
    const block = customerCreateBlock(existing);
    if (block === 'suspended') {
        return { ok: false, status: 409, message: 'This account is suspended.' };
    }
    if (block === 'exists') {
        return { ok: true, created: false, customers: existing.filter((customer) => customer.status !== 'suspended') };
    }

    const authUser = await getOrCreateUserByPhone(phone);
    const ref = adminDb.collection('users').doc(authUser.uid);
    const snap = await ref.get();
    if (snap.exists && snap.data()?.status === 'suspended') {
        return { ok: false, status: 409, message: 'This account is suspended.' };
    }

    const now = new Date().toISOString();
    const data = snap.data() || {};
    const existingName = String(data.name || '').trim();
    const nextName = existingName && existingName !== 'User' ? existingName : name;
    await ref.set({
        phone,
        name: nextName,
        updatedAt: now,
        ...(snap.exists ? {} : {
            role: 'user',
            email: authUser.email || '',
            status: 'active',
            loyaltyPoints: 0,
            createdAt: now,
        }),
    }, { merge: true });

    const customer = toStaffCustomer(authUser.uid, {
        ...data,
        phone,
        name: nextName,
        role: data.role || 'user',
        status: data.status || 'active',
        email: data.email || authUser.email || '',
        loyaltyPoints: data.loyaltyPoints || 0,
    });
    return { ok: true, created: !snap.exists, customers: [customer] };
}
