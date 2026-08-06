# Mel-Agri Production Launch Checklist

## Code and infrastructure

- [ ] Review and commit the market-readiness changes.
- [ ] Run `npm ci`, `npm run check:env:production`, `npm test`, `npm run test:rules`, `npm run lint`, and `npm run build` in CI.
- [ ] Deploy `firestore.rules` and `storage.rules` to the intended Firebase project.
- [ ] Confirm `GET /api/health` returns HTTP 200 on the production domain.
- [ ] Configure scheduled Firestore exports and document a restore drill.

## Identity and access

- [ ] Assign the first administrator through a trusted Firebase Admin SDK process.
- [ ] Verify a customer receives HTTP 403 for admin pages and APIs.
- [ ] Verify logout clears the HTTP-only session cookie.
- [ ] Remove former staff accounts and rotate shared credentials.

## Payments

- [ ] Confirm `MPESA_ENV=production` and `MPESA_DISABLE_IP_CHECK` is absent or `false`.
- [ ] Complete successful and rejected M-Pesa STK transactions.
- [ ] Confirm duplicate and delayed callbacks cannot duplicate orders or payment records.
- [ ] Register production C2B URLs and test an unmatched manual Till payment.
- [ ] Test M-Pesa retry, status lookup, and reversal with authorized staff.
- [ ] Complete successful and rejected Paystack transactions.
- [ ] Confirm invalid Paystack webhook signatures are rejected.

## Customer communications

- [ ] Deliver a test order email externally and check SPF, DKIM, and DMARC alignment.
- [ ] Deliver a production Africa's Talking SMS to a Kenyan number.
- [ ] Deliver a Twilio WhatsApp notification from the approved sender.
- [ ] Confirm notification failures cannot change payment or order status.

## Browser acceptance

- [ ] Test login, logout, phone verification, and session expiry.
- [ ] Test search, filters, cart, checkout, payment, and confirmation on mobile and desktop.
- [ ] Test customer orders, returns, addresses, invoices, receipts, and delivery notes.
- [ ] Test admin products, Excel import/export, inventory, payments, and fulfillment.
- [ ] Test Chrome, Safari, and Firefox, including a slow mobile connection.

## Operations and compliance

- [ ] Configure monitoring for payment callbacks, notification delivery, and HTTP 5xx spikes.
- [ ] Confirm support contacts, operating hours, delivery promises, returns, and company identity.
- [ ] Confirm privacy and data-retention wording with the business owner or legal adviser.
- [ ] Assign an incident owner and document rollback, refund, and customer-notification procedures.
