import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('notification relays are sealed (410) for authenticated callers', () => {
    for (const channel of ['sms', 'email', 'whatsapp']) {
        const source = readFileSync(join(process.cwd(), `src/app/api/notifications/${channel}/route.ts`), 'utf8');
        assert.match(source, /status: 410/);
        assert.match(source, /requirePermission/);
        assert.doesNotMatch(source, /from 'nodemailer'|from 'twilio'|sendServerSms\(/);
    }
});

test('C2B auto-match requires amount equality before Paid', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/api/payment/mpesa/c2b-confirmation/route.ts'), 'utf8');
    assert.match(source, /amountMatchesOrder/);
    assert.match(source, /markOrderPaidWithReceipt/);
    assert.match(source, /status: 500/);
});

test('Paystack webhook applies payment and dedup in one transaction', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/api/payment/paystack/webhook/route.ts'), 'utf8');
    assert.match(source, /runTransaction/);
    assert.match(source, /status: 'applied'/);
});

test('stock reservation expiry is scheduled', () => {
    const expire = readFileSync(join(process.cwd(), 'src/lib/expire-stock-reservations.ts'), 'utf8');
    const cron = readFileSync(join(process.cwd(), 'src/app/api/cron/expire-stock/route.ts'), 'utf8');
    const maintenance = readFileSync(join(process.cwd(), 'src/app/api/cron/intelligence-maintenance/route.ts'), 'utf8');
    assert.match(expire, /stockReservationStatus/);
    assert.match(expire, /Stock reservation expired/);
    assert.match(cron, /expireStockReservations/);
    assert.match(maintenance, /stockReservations/);
});

test('health probe requires CRON_SECRET', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/api/health/route.ts'), 'utf8');
    assert.match(source, /CRON_SECRET/);
    assert.match(source, /status: 401/);
});

test('order access secret fails closed in production', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/order-access.ts'), 'utf8');
    assert.match(source, /ORDER_ACCESS_SECRET/);
    assert.match(source, /must be configured in production/);
    assert.doesNotMatch(source, /FIREBASE_PRIVATE_KEY/);
});
