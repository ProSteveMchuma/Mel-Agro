# Mel-Agri Intelligence Architecture

## Purpose and operating rules

The intelligence layer turns consented first-party commerce data into explainable customer suggestions and reviewable admin actions. It must not infer sensitive traits, expose one customer's behavior to another, silently contact a customer, or automate safety-critical agronomic advice.

## Customer flow

1. Product views and cart actions update a customer's category-affinity profile.
2. The homepage ranks only available products using affinity, county-level paid-order demand, product quality, and trust signals. Every personalized item includes a reason and the customer can turn personalization off.
3. A stable `personalized-home-v1` experiment compares personalized ranking with the quality baseline. Recommendation impressions, clicks, and adds to cart are aggregated by model and experiment variant.
4. Paid repeat orders generate reorder windows using median purchase intervals. Low-confidence estimates are labelled and no notification is sent automatically.
5. Cart recovery requires explicit `cartRecoveryConsent`, observes a 72-hour cooldown, and permits at most three recorded contacts.
6. AgroBot uses the live catalog, delivery-zone configuration, and the signed-in customer's orders. It cites the source class and refuses pesticide/veterinary dosage, mixing, and diagnosis requests in favour of qualified human help.

## Admin flow

- **Action Centre:** synchronizes stock, demand, payment, refund, and fulfillment-SLA signals. Staff assign, acknowledge, snooze, progress, and resolve alerts with outcomes.
- **Product Intelligence:** combines paid demand, search gaps, lead time, safety stock, MOQ, and incoming stock. Co-purchase suggestions exclude unavailable and safety-sensitive categories.
- **Customer Intelligence:** unifies guest and account orders using normalized phone first, then email and UID. It explains segments, reorder opportunities, and consent state.
- **Fulfillment:** distinguishes likely provider incidents, customer friction, and callback delays, and compares actual delivery time with the configured county ETA.
- **AI briefing:** receives a bounded aggregate snapshot, must cite snapshot field names, displays limitations, and never performs operational actions.
- **Intelligence Health:** reports recommendation outcomes, paid-order/purchase reconciliation, schema coverage, product-data gaps, alert freshness, and retention backlog.

## Trust boundaries

- Browser code sends events through authenticated/rate-limited API routes. It cannot write server-authoritative analytics, payments, alerts, or AI cache collections.
- Admin APIs verify Firebase ID tokens and the stored admin role.
- Firestore Admin SDK writes bypass rules only on trusted server routes.
- Payment state comes from verified provider callbacks/status checks, never from customer-supplied success flags.
- AI text is advisory. Refunds, substitutions, customer messages, and operational state changes require explicit staff actions.

## Data minimization and retention

Search analytics reject likely email addresses and Kenyan phone numbers. Recommendation records contain product/model aggregates rather than message content or contact details. Scheduled maintenance deletes visit-deduplication data after 2 days, search/recommendation aggregates after 395 days, and reconciliation/action records after 730 days, in bounded batches. Statutory order and financial retention is managed separately.

## Production operations

Set `CRON_SECRET` and configure the daily `/api/cron/intelligence-maintenance` schedule. Use the Intelligence Health page after releases and at least weekly. Investigate reconciliation gaps before using conversion results. Review experiment guardrails before increasing treatment allocation. Deploy `firestore.rules` with application changes and follow [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) and [MONITORING.md](./MONITORING.md).

## External verification still required

- Confirm the hosting scheduler is enabled and successfully invokes the maintenance endpoint.
- Confirm production Africa's Talking sender approval and deliver a real opt-in SMS to a controlled test number.
- Confirm alert webhook delivery to the production receiver.
- Run a real low-value M-Pesa payment, callback, order claim, and refund/reversal drill.
- Verify daily Firestore export creation and complete a restore drill into a non-production project.
