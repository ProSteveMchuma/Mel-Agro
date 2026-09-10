import 'server-only';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { isAdvantaConfigured, sendAdvantaSms } from '@/lib/advanta-sms';
import { normalizeKenyanPhone } from '@/lib/account-upgrade';
import {
    assertCanSendOtp,
    assertCanVerifyOtp,
    generateOtpCode,
    loginOtpSms,
    nextOtpChallenge,
    otpPhoneDocId,
    type OtpChallenge,
} from '@/lib/phone-otp';

function otpPepper(): string {
    return (process.env.OTP_PEPPER || process.env.FIREBASE_PRIVATE_KEY || 'melagri-otp-pepper').slice(0, 80);
}

function challengeRef(phone: string) {
    return adminDb.collection('otpChallenges').doc(otpPhoneDocId(phone));
}

async function getOrCreateUserByPhone(phone: string) {
    try {
        return await adminAuth.getUserByPhoneNumber(phone);
    } catch (error: any) {
        if (error?.code !== 'auth/user-not-found') throw error;
    }

    try {
        return await adminAuth.createUser({ phoneNumber: phone });
    } catch (error: any) {
        if (error?.code !== 'auth/phone-number-already-exists') throw error;
        return adminAuth.getUserByPhoneNumber(phone);
    }
}

export async function sendLoginOtp(rawPhone: string): Promise<{
    ok: boolean;
    message: string;
    status?: number;
    retryAfterSeconds?: number;
}> {
    let phone: string;
    try {
        phone = normalizeKenyanPhone(rawPhone);
    } catch {
        return { ok: false, status: 400, message: 'Please enter a valid Kenyan phone number (e.g. 0712 345 678).' };
    }

    if (!isAdvantaConfigured()) {
        return { ok: false, status: 503, message: 'SMS login is temporarily unavailable. Please try again shortly.' };
    }

    const ref = challengeRef(phone);
    const snap = await ref.get();
    const previous = snap.data() as OtpChallenge | undefined;
    const allowed = assertCanSendOtp(previous);
    if (!allowed.ok) {
        return { ok: false, status: 429, message: allowed.message, retryAfterSeconds: allowed.retryAfterSeconds };
    }

    const code = generateOtpCode();
    const challenge = nextOtpChallenge(phone, code, otpPepper(), previous);
    await ref.set({
        ...challenge,
        phone,
        updatedAt: new Date().toISOString(),
    });

    const sent = await sendAdvantaSms(phone, loginOtpSms(code));
    if (!sent.ok) {
        if (previous?.codeHash) {
            await ref.set({ ...previous, phone, sentAtMs: 0, updatedAt: new Date().toISOString() });
        } else {
            await ref.delete().catch(() => undefined);
        }
        console.warn('[phone-otp] Advanta did not send login OTP:', sent.reason);
        return { ok: false, status: 503, message: 'Could not send the SMS. Please try again.' };
    }

    return { ok: true, message: 'Code sent' };
}

export async function verifyLoginOtp(rawPhone: string, code: string): Promise<{
    ok: boolean;
    token?: string;
    message: string;
}> {
    let phone: string;
    try {
        phone = normalizeKenyanPhone(rawPhone);
    } catch {
        return { ok: false, message: 'Please enter a valid Kenyan phone number.' };
    }

    const ref = challengeRef(phone);
    const snap = await ref.get();
    const challenge = snap.data() as OtpChallenge | undefined;
    const result = assertCanVerifyOtp(challenge, phone, String(code || '').trim(), otpPepper());

    if (!result.ok) {
        if (challenge?.codeHash && result.message.startsWith('Invalid OTP')) {
            await ref.set({
                attempts: (Number(challenge.attempts) || 0) + 1,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        }
        return { ok: false, message: result.message };
    }

    const user = await getOrCreateUserByPhone(phone);
    const token = await adminAuth.createCustomToken(user.uid);
    const userRef = adminDb.collection('users').doc(user.uid);
    const existing = await userRef.get();
    await userRef.set({
        phone,
        updatedAt: new Date().toISOString(),
        ...(existing.exists ? {} : {
            name: user.displayName || 'User',
            email: user.email || '',
            role: 'user',
            createdAt: new Date().toISOString(),
        }),
    }, { merge: true });
    await ref.delete().catch(() => undefined);

    return { ok: true, token, message: 'Verified' };
}
