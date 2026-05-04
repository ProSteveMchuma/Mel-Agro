# Environment Variables Guide

To enable real API integrations, you need to add the following variables to your `.env.local` file.

## Firebase Configuration (Required)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Firebase Admin SDK (Required for Server-Side Ops)
```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="your_private_key_with_newlines"
```

## M-Pesa Daraja API (Required for M-Pesa Payments)
Get these from the [Safaricom Developer Portal](https://developer.safaricom.co.ke/).

### Required for STK Push (Lipa na M-Pesa)
```env
MPESA_ENV=sandbox                # or 'production' once you go live
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379           # Sandbox default; in production this is your Head Office / Store Number
MPESA_TILL_NUMBER=174379         # Same as shortcode for Paybill, OR your Till Number for Buy Goods
MPESA_CALLBACK_URL=https://your-domain.com/api/payment/mpesa/callback
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Optional: Reversal & TransactionStatus (admin refunds)
Required only if you want to enable the "Refund / Reverse" admin button. Without these, the rest of M-Pesa works fine.
```env
MPESA_INITIATOR_NAME=apitest                # Your Daraja initiator username
MPESA_INITIATOR_PASSWORD=your_initiator_pwd # Plaintext — encrypted at runtime against Safaricom's public cert
# Optional override; defaults to src/lib/mpesa-certs/{Production|Sandbox}Certificate.cer
# MPESA_PUBLIC_CERT_PATH=/absolute/path/to/ProductionCertificate.cer
```

Download the certificates from [developer.safaricom.co.ke → Get Certificate](https://developer.safaricom.co.ke) and place them at:
- Production: `src/lib/mpesa-certs/ProductionCertificate.cer`
- Sandbox: `src/lib/mpesa-certs/SandboxCertificate.cer`

### Going live
Production credentials only work after Safaricom approves your Daraja app via the Go-Live process. The `MPESA_SHORTCODE` for production is your **Head Office Number** (linked to your Till), not the till number itself.

### Optional: Disable Safaricom IP allowlist
The callback / reversal-result / c2b-confirmation webhooks check that the request comes from a known Safaricom IP range. The check is auto-disabled when `MPESA_ENV !== 'production'`. To force-disable in production (e.g. when debugging through a proxy), set:
```env
MPESA_DISABLE_IP_CHECK=true
```
Re-enable as soon as you're done — without this check, anyone who knows your callback URL can post fake payment confirmations.

### Optional: C2B URL registration (auto-match Till payments)
Once deployed, an admin should visit `/dashboard/admin/settings/mpesa` and click **Register C2B URLs**. This tells Safaricom to call your site every time someone pays into your Till — including manual Buy Goods payments outside the STK push checkout. The system then auto-matches each payment to an unpaid order by phone+amount, eliminating most manual verification.

You only need to register once per environment (sandbox vs production). Re-register if your domain changes.

### Three levels of M-Pesa payment automation

The codebase supports three escalating levels of automation for manual M-Pesa (Buy Goods) payments. Pick what fits your operations:

| Level | Customer experience | Admin experience | Setup required |
|-------|---------------------|------------------|----------------|
| **1. Manual typing** (default) | Customer pays to till, returns to site, types the receipt code | Admin opens order, clicks **Approve** in the Verify Manual modal | None — works out of the box |
| **2. Daraja auto-verify** | Customer pays to till, returns to site, types the receipt code | Admin opens order, clicks **Auto-Verify with Safaricom** in the Verify Manual modal — Daraja TransactionStatus API confirms the receipt and auto-marks the order Paid | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD`, and the production cert (`ProductionCertificate.cer`) at `src/lib/mpesa-certs/` |
| **3. C2B auto-match** | Customer just pays — never returns to type anything | Nothing — system marks order Paid within ~10 seconds via the C2B confirmation webhook | One-time URL registration via `/dashboard/admin/settings/mpesa` after production deploy |

**Recommendation:** Run Level 3 + Level 1 (Level 2 is the in-between, optional). Level 3 covers ~95% of payments without admin work; Level 1 stays as a manual fallback for the rare case where a customer's payment doesn't land in the C2B confirmation feed (rare but possible). The checkout UI already nudges customers in this direction — the receipt-code input is now optional with the message *"Just pay — we'll detect it automatically. The code below is only needed if it doesn't show up."*

### Admin payment reminders

Admins can dispatch SMS + email reminders for any unpaid order from the order detail page (under Financial Settlement → **Send Payment Reminder**). The reminder includes the outstanding amount, a deep link to the user's dashboard for one-tap M-Pesa retry, and the Till number for direct Buy Goods payment. Each reminder is recorded on the order doc (`reminders[]`, `reminderCount`, `lastReminderAt`) so admins can see how many times a customer has been nudged.

The reminder feature uses the same SMTP + Africa's Talking credentials as the rest of the comms stack — no extra setup beyond what's already needed for order confirmations.

## Paystack API (Required for Card Payments)
Get these from the [Paystack Dashboard](https://dashboard.paystack.com/).
```env
PAYSTACK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...
```

## Email (SMTP) Configuration (Required for Emails)
Use your own SMTP server credentials (e.g., from cPanel, Gmail, Outlook).
```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password
SMTP_FROM="MelAgro" <noreply@melagro.com>
```

## Admin Setup (Optional — for one-off admin claim)
Set this only if you need to use the `/admin-setup` page to bootstrap your first admin user. Server-only — does NOT use the `NEXT_PUBLIC_` prefix:
```env
ADMIN_SECRET_CODE=some-long-random-string
```
Once your first admin is set up, delete `/admin-setup` and remove this env var.

## Africa's Talking SMS (Required for SMS)
Get these from [Africa's Talking](https://africastalking.com/).
```env
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_SENDER_ID=MELAGRO
```
