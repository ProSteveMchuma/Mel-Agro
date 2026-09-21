/** Loyalty rates used across account, checkout, and fulfillment. */
export const LOYALTY_EARN_KES_PER_POINT = 100;
/** Redeemed points reduce the order total 1:1 in KES. */
export const LOYALTY_REDEEM_KES_PER_POINT = 1;

export function pointsEarnedForOrderTotal(total: number): number {
    return Math.floor(Math.max(0, Number(total) || 0) / LOYALTY_EARN_KES_PER_POINT);
}

export function redeemableKes(points: number, cartTotal: number): number {
    return Math.min(Math.max(0, Math.floor(Number(points) || 0)), Math.max(0, Number(cartTotal) || 0));
}
