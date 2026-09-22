import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { adminOrderMutationSchema, paymentDateSchema } from '../src/lib/admin-order-mutations.ts';

test('payment date accepts HTML date inputs used by Record Payment modal', () => {
  assert.equal(paymentDateSchema.parse('2026-09-22'), '2026-09-22T12:00:00.000Z');
  assert.equal(paymentDateSchema.parse('2026-09-22T00:00:00.000Z'), '2026-09-22T00:00:00.000Z');
  assert.throws(() => paymentDateSchema.parse('22/09/2026'));
});

test('manual cash payment payload from Secure Record validates', () => {
  const parsed = adminOrderMutationSchema.parse({
    action: 'payment_status',
    orderId: '4OBGbMiNUhwmIZ1HfhRa',
    paymentStatus: 'Paid',
    transaction: {
      amount: 2,
      reference: 'XNFGTHD',
      date: '2026-09-22',
      method: 'Cash',
    },
  });
  assert.equal(parsed.action, 'payment_status');
  if (parsed.action === 'payment_status') {
    assert.equal(parsed.transaction?.date, '2026-09-22T12:00:00.000Z');
    assert.equal(parsed.transaction?.amount, 2);
    assert.equal(parsed.transaction?.reference, 'XNFGTHD');
  }
});

test('order details page surfaces API errors and normalizes date-only values', () => {
  const source = readFileSync(join(process.cwd(), 'src/app/dashboard/admin/orders/[id]/page.tsx'), 'utf8');
  assert.match(source, /T12:00:00\.000Z/);
  assert.match(source, /error instanceof Error \? error\.message/);
  assert.match(source, /payments\.manage/);
});
