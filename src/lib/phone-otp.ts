import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_COOLDOWN_MS = 45 * 1000;
export const OTP_MAX_SENDS_PER_HOUR = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LENGTH = 6;

export interface OtpChallenge {
    codeHash?: string;
    expiresAtMs?: number;
    sentAtMs?: number;
    sendWindowStartMs?: number;
    sendCount?: number;
    attempts?: number;
}

export function otpPhoneDocId(e164: string): string {
    return e164.replace(/\D/g, '');
}

export function generateOtpCode(): string {
    return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

export function hashOtpCode(phone: string, code: string, pepper: string): string {
    return createHash('sha256').update(`${phone}:${code}:${pepper}`).digest('hex');
}

export function otpCodesMatch(leftHex: string, rightHex: string): boolean {
    try {
        const left = Buffer.from(leftHex, 'hex');
        const right = Buffer.from(rightHex, 'hex');
        if (left.length === 0 || left.length !== right.length) return false;
        return timingSafeEqual(left, right);
    } catch {
        return false;
    }
}

export function loginOtpSms(code: string): string {
    return `Habari, your Mel-Agri login code is ${code}. Valid 10 min. Do not share it.`;
}

export function assertCanSendOtp(challenge: OtpChallenge | undefined, now = Date.now()) {
    const sentAtMs = Number(challenge?.sentAtMs) || 0;
    if (sentAtMs && now - sentAtMs < OTP_COOLDOWN_MS) {
        return {
            ok: false as const,
            message: 'Please wait a moment before requesting another code.',
            retryAfterSeconds: Math.ceil((OTP_COOLDOWN_MS - (now - sentAtMs)) / 1000),
        };
    }

    const windowStart = Number(challenge?.sendWindowStartMs) || 0;
    const inWindow = windowStart && now - windowStart < 60 * 60 * 1000;
    const sendCount = inWindow ? Number(challenge?.sendCount) || 0 : 0;
    if (sendCount >= OTP_MAX_SENDS_PER_HOUR) {
        return {
            ok: false as const,
            message: 'Too many codes sent to this number. Try again later.',
            retryAfterSeconds: Math.ceil((60 * 60 * 1000 - (now - windowStart)) / 1000),
        };
    }

    return {
        ok: true as const,
        sendCount: sendCount + 1,
        sendWindowStartMs: inWindow ? windowStart : now,
    };
}

export function nextOtpChallenge(phone: string, code: string, pepper: string, previous: OtpChallenge | undefined, now = Date.now()): OtpChallenge {
    const allowed = assertCanSendOtp(previous, now);
    if (!allowed.ok) throw new Error(allowed.message);
    return {
        codeHash: hashOtpCode(phone, code, pepper),
        expiresAtMs: now + OTP_TTL_MS,
        sentAtMs: now,
        sendWindowStartMs: allowed.sendWindowStartMs,
        sendCount: allowed.sendCount,
        attempts: 0,
    };
}

export function assertCanVerifyOtp(challenge: OtpChallenge | undefined, phone: string, code: string, pepper: string, now = Date.now()) {
    if (!challenge?.codeHash || !challenge.expiresAtMs) {
        return { ok: false as const, message: 'Request a new code and try again.' };
    }
    if (now > Number(challenge.expiresAtMs)) {
        return { ok: false as const, message: 'That code has expired. Request a new one.' };
    }
    if ((Number(challenge.attempts) || 0) >= OTP_MAX_ATTEMPTS) {
        return { ok: false as const, message: 'Too many attempts. Request a new code.' };
    }
    if (!/^\d{6}$/.test(code) || !otpCodesMatch(challenge.codeHash, hashOtpCode(phone, code, pepper))) {
        return { ok: false as const, message: 'Invalid OTP code. Please check and try again.' };
    }
    return { ok: true as const };
}
