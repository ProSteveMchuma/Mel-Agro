import test from 'node:test';
import assert from 'node:assert/strict';
import {
    assertCanSendOtp,
    assertCanVerifyOtp,
    hashOtpCode,
    loginOtpSms,
    nextOtpChallenge,
    otpCodesMatch,
    otpPhoneDocId,
    OTP_COOLDOWN_MS,
    OTP_MAX_ATTEMPTS,
    OTP_TTL_MS,
} from '../src/lib/phone-otp.ts';

const phone = '+254712345678';
const pepper = 'test-pepper';

test('hashes OTP codes without storing the raw value', () => {
    const hash = hashOtpCode(phone, '123456', pepper);
    assert.equal(hash.length, 64);
    assert.equal(hash.includes('123456'), false);
    assert.equal(otpCodesMatch(hash, hashOtpCode(phone, '123456', pepper)), true);
    assert.equal(otpCodesMatch(hash, hashOtpCode(phone, '000000', pepper)), false);
});

test('login OTP SMS is sent from Makamithi copy and stays one segment', () => {
    const sms = loginOtpSms('482913');
    assert.match(sms, /482913/);
    assert.match(sms, /Mel-Agri/);
    assert.ok(sms.length <= 160);
});

test('uses digits-only Firestore ids for OTP challenges', () => {
    assert.equal(otpPhoneDocId('+254712345678'), '254712345678');
});

test('enforces OTP send cooldown and hourly cap', () => {
    const now = 1_000_000;
    const cooldown = assertCanSendOtp({ sentAtMs: now - 10_000 }, now);
    assert.equal(cooldown.ok, false);

    const allowed = assertCanSendOtp({ sentAtMs: now - OTP_COOLDOWN_MS - 1 }, now);
    assert.equal(allowed.ok, true);

    const capped = assertCanSendOtp({
        sendWindowStartMs: now - 1000,
        sendCount: 5,
        sentAtMs: now - OTP_COOLDOWN_MS - 1,
    }, now);
    assert.equal(capped.ok, false);
});

test('rejects expired, guessed, and over-attempted OTP codes', () => {
    const now = 5_000_000;
    const challenge = nextOtpChallenge(phone, '654321', pepper, undefined, now);

    assert.equal(assertCanVerifyOtp(challenge, phone, '654321', pepper, now).ok, true);
    assert.equal(assertCanVerifyOtp(challenge, phone, '000000', pepper, now).ok, false);
    assert.equal(assertCanVerifyOtp(challenge, phone, '654321', pepper, now + OTP_TTL_MS + 1).ok, false);
    assert.equal(assertCanVerifyOtp({ ...challenge, attempts: OTP_MAX_ATTEMPTS }, phone, '654321', pepper, now).ok, false);
});
