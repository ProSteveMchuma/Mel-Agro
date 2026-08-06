# Mel-Agri Intelligence Roadmap

## Product principle

Intelligence should reduce a farmer's uncertainty or an operator's workload. Recommendations must explain why they are shown, use only consented first-party data, and leave the human in control. Do not infer sensitive traits or expose one customer's behavior to another.

## Phase 1: useful prediction from existing data

### Reorder timing

Estimate when a customer may need the same seed, fertilizer, or treatment again using completed-order dates, product category, pack size, and quantity. Show a quiet reminder such as “You last bought this 11 weeks ago” rather than claiming certainty. Let the customer dismiss or adjust reminders.

### Location-aware catalog

Use the selected county, delivery zone, season, stock availability, and product tags to rank relevant products. Always show the reason: “Available in Nakuru” or “Commonly ordered during the short rains.” Never hide the full catalog.

### Explainable complementary products

Recommend genuinely compatible items from aggregate order co-occurrence and agronomic rules. Avoid recommendations that could create unsafe chemical combinations. Each suggestion should include a short reason and allow removal.

### Operations alerts

Combine search demand, abandoned carts, stock velocity, payment failures, and delivery SLA data into prioritized actions. Examples: replenish a fast-moving product, investigate a county with repeated checkout failures, or follow up on paid orders approaching the dispatch SLA.

## Phase 2: farmer decision support

### Guided product selection

Ask a small number of structured questions—crop, acreage, county, planting stage, and goal—then return a shortlist with explicit assumptions. Do not provide pesticide dosage or safety advice without authoritative product-label data.

### Seasonal farm plan

With customer consent, turn crop, acreage, location, and target planting date into a checklist and estimated input quantities. Treat weather and agronomy outputs as guidance, show source dates, and provide a path to human support.

### Delivery prediction

Learn from actual dispatch and delivery timestamps by zone and carrier. Present a range with confidence rather than an exact promise, and fall back to configured delivery rules when data is sparse.

## Phase 3: optimization

### Demand forecasting

Forecast product demand by county, category, and week using paid orders, stock-outs, search intent, seasonality, promotions, and fulfillment constraints. Maintain a simple baseline alongside any advanced model and measure forecast error.

### Customer service copilot

Draft answers using the customer's own order state and approved policy content. Require staff confirmation before sending refunds, promises, substitutions, or agronomic advice. Log source references and staff actions.

## Data foundation

- Use paid orders rather than initiated orders as the primary demand signal.
- Record explicit product taxonomy, crop suitability, pack size, season, and safety metadata.
- Record dispatch and delivered timestamps consistently.
- Keep recommendation events pseudonymous and free of message contents or contact details.
- Define retention periods and allow customers to opt out of personalization.
- Measure recommendation impressions, dismissals, clicks, purchases, and downstream return rates.

## Success metrics

- Reorder reminder acceptance without increased notification opt-outs
- Recommendation conversion and gross margin, balanced against return rate
- Reduced payment failure and abandoned-cart rates
- Reduced paid-to-dispatched time
- Forecast error and prevented stock-out days
- Customer-support resolution time and staff edit rate

## Recommended next build

Start with explainable reorder timing and operational anomaly alerts. Both use existing data, have measurable value, and avoid the safety risk of premature agronomic recommendations.
