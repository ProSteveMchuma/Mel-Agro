# Production Monitoring and Alerting

The server emits structured `melagri_incident` JSON events and optionally posts redacted incidents to `ALERT_WEBHOOK_URL`. Configure the webhook as a Slack, Teams, PagerDuty, or internal incident receiver. If the receiver requires bearer authentication, configure `ALERT_WEBHOOK_TOKEN`.

Covered events:

- M-Pesa payment failures and callback exceptions
- Paystack webhook exceptions
- Africa's Talking, SMTP, and Twilio WhatsApp failures
- API rate-limit violations indicating unusual traffic
- Scheduled Firestore backup workflow failures

Identical runtime incidents are deduplicated for five minutes. Credentials, authorization headers, cookies, phone numbers, and email fields are redacted before delivery.

Recommended production alerts:

- Critical: any callback-processing or scheduled-backup failure
- Warning: five payment failures within ten minutes for one provider
- Warning: three notification-provider failures within fifteen minutes
- Warning: sustained HTTP 429 or HTTP 5xx responses above the normal baseline
- Warning: `/api/health` returns 503 for two consecutive checks

Retain structured application logs for at least 30 days and payment/audit logs according to the business and regulatory retention policy. Test the incident receiver during every release without including customer data.
