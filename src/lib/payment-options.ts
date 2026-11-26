/**
 * Storefront payment switches.
 *
 * Cash on delivery is paused for now. Flip this to `true` to offer it again at
 * checkout; the footer, FAQ and billing copy read from it too.
 * Orders a promo or points cover in full still go through the COD path,
 * because there is nothing to collect on them.
 */
export const CASH_ON_DELIVERY_ENABLED = false;

/** Whether a new order with this total may use the cash-on-delivery method. */
export function cashOnDeliveryAllowed(total: number): boolean {
    return CASH_ON_DELIVERY_ENABLED || total <= 0;
}
