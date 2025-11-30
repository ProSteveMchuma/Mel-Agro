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
```env
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://your-domain.com/api/payment/mpesa/callback
```

## Stripe API (Required for Card Payments)
Get these from the [Stripe Dashboard](https://dashboard.stripe.com/).
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
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

## Africa's Talking SMS (Required for SMS)
Get these from [Africa's Talking](https://africastalking.com/).
```env
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_SENDER_ID=MELAGRO
```
