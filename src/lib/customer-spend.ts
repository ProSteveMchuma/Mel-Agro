export function sumPaidSpend(orders: Array<{ paymentStatus?: string | null; total?: number | null }>) {
    return orders.reduce((sum, order) => (
        order.paymentStatus === "Paid" ? sum + (Number(order.total) || 0) : sum
    ), 0);
}
