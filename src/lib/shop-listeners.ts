/** Live catalogue stream is only for admin screens that still read the whole list. */
export function needsLiveProductStream(pathname: string): boolean {
    if (pathname === '/dashboard/admin') return true;
    if (pathname.startsWith('/dashboard/admin/orders/create')) return true;
    if (pathname.startsWith('/dashboard/admin/products/edit')) return true;
    return false;
}

/** A farmer's orders are for the account, an order document, and checkout. */
export function needsCustomerOrders(pathname: string): boolean {
    return pathname.startsWith('/dashboard/user')
        || pathname.startsWith('/orders')
        || pathname.startsWith('/checkout');
}

/** Alerts are shown on the account page and in the admin console. */
export function needsNotificationStream(pathname: string): boolean {
    return pathname.startsWith('/dashboard');
}
