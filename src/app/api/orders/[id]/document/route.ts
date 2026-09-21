import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/request-guard';
import { authorizeOrderAction } from '@/lib/order-access-server';

/**
 * Full order payload for printable documents (invoice / receipt / delivery note).
 * Authorized via signed-in owner/admin or SMS order access token (?t=).
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const limited = enforceRateLimit(request, 'order-document', 60, 60_000);
    if (limited) return limited;

    const { id: orderId } = await context.params;
    const url = new URL(request.url);
    const accessToken = url.searchParams.get('t') || url.searchParams.get('token');

    const auth = await authorizeOrderAction({
        request,
        orderId,
        action: 'view',
        // Any valid SMS action token proves phone ownership for printable docs.
        acceptActions: ['view', 'pay', 'return'],
        accessToken,
    });

    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    const data = auth.order.data as Record<string, any>;
    const order = {
        id: auth.order.id,
        userId: data.userId || '',
        userName: data.userName || '',
        userEmail: data.userEmail || '',
        phone: data.phone || '',
        date: data.date || data.createdAt || new Date().toISOString(),
        total: Number(data.total) || 0,
        subtotal: data.subtotal != null ? Number(data.subtotal) : undefined,
        shippingCost: Number(data.shippingCost) || 0,
        discountAmount: Number(data.discountAmount) || 0,
        couponCode: data.couponCode || null,
        paymentMethod: data.paymentMethod || 'Online',
        paymentStatus: data.paymentStatus || 'Unpaid',
        transactionId: data.transactionId || null,
        mpesaReceiptNumber: data.mpesaReceiptNumber || data.transactionId || null,
        status: data.status || 'Pending Payment',
        shippingMethod: data.shippingMethod || data.shippingAddress?.method || null,
        shippingAddress: data.shippingAddress
            ? {
                county: data.shippingAddress.county || '',
                details: data.shippingAddress.details || '',
                method: data.shippingAddress.method || null,
            }
            : { county: '', details: '' },
        tracking: data.tracking || null,
        items: Array.isArray(data.items)
            ? data.items.map((item: any) => ({
                id: String(item.id || ''),
                name: String(item.name || 'Item'),
                quantity: Number(item.quantity) || 1,
                price: Number(item.price) || 0,
            }))
            : [],
    };

    return NextResponse.json({ success: true, order, access: auth.via });
}
