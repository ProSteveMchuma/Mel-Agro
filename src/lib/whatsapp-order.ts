import { hasAdminPermission, type AdminPermission } from './admin-permissions.ts';
import { normalizeKenyanPhone } from './account-upgrade.ts';
import { orderPhoneKey, phoneQueryVariants } from './phone-match.ts';
import { getWhatsAppDirectUrl } from './whatsapp.ts';

/** Stored on staff WhatsApp orders so the existing M-Pesa card, STK retry, and pay link apply. */
export const WHATSAPP_STAFF_ORDER = {
    paymentMethod: 'M-Pesa',
    paymentStatus: 'Unpaid' as const,
    status: 'Pending Payment' as const,
    orderChannel: 'whatsapp' as const,
};

export function mpesaControlVisibility(paymentMethod?: string | null) {
    const method = String(paymentMethod || '').toLowerCase();
    return {
        isMpesa: method.includes('m-pesa') || method.includes('mpesa'),
        isStk: method === 'm-pesa' || method === 'mpesa',
    };
}

export function paymentPromptAccess(
    role: string | undefined,
    permissions: string[] | undefined,
): { canPrompt: boolean; canVerify: boolean } {
    return {
        canPrompt: hasAdminPermission(role, permissions, 'orders.manage' satisfies AdminPermission),
        canVerify: hasAdminPermission(role, permissions, 'payments.manage' satisfies AdminPermission),
    };
}

export function reminderBlockReason(paymentStatus?: string | null): string | null {
    if (paymentStatus === 'Paid') return 'Order is already paid — nothing to remind';
    if (paymentStatus === 'Refunded') return 'Order has been refunded';
    return null;
}

export type PhoneCustomer = {
    id: string;
    phone?: string | null;
    status?: string | null;
};

/** Match staff-entered numbers to stored profiles (`0712…`, `254712…`, `+254712…`). */
export function customersMatchingPhone<T extends PhoneCustomer>(customers: T[], raw: string): T[] {
    const variants = phoneQueryVariants(raw);
    const key = orderPhoneKey(raw);
    if (!key) return [];
    const variantSet = new Set(variants);
    return customers.filter((customer) => {
        const phone = String(customer.phone || '');
        if (phone && variantSet.has(phone)) return true;
        return orderPhoneKey(phone) === key;
    });
}

/** Empty list means a new customer. Suspended matches must not get a second profile. */
export function customerCreateBlock(matches: Array<{ status?: string | null }>): 'suspended' | 'exists' | null {
    if (matches.length === 0) return null;
    if (matches.every((match) => match.status === 'suspended')) return 'suspended';
    return 'exists';
}

export function promptPhone(orderPhone?: string | null, override?: string | null): string {
    const raw = String(override || orderPhone || '').trim();
    return normalizeKenyanPhone(raw);
}

export function stkRetryBody(orderId: string, phone: string) {
    return { orderId, phoneNumber: promptPhone(phone) };
}

export function catalogueUnitPrice(
    product: { price?: number | null; variants?: Array<{ id?: string; price?: number | null }> | null },
    variantId?: string | null,
): number {
    const variant = variantId
        ? product.variants?.find((entry) => String(entry.id) === variantId)
        : undefined;
    if (variant && variant.price != null && Number.isFinite(Number(variant.price))) {
        return Number(variant.price);
    }
    return Number(product.price) || 0;
}

export function catalogueUnitsAvailable(
    product: { stockQuantity?: number | null; variants?: Array<{ id?: string; stockQuantity?: number | null; stock?: number | null }> | null },
    variantId?: string | null,
): number {
    if (variantId) {
        const variant = product.variants?.find((entry) => String(entry.id) === variantId);
        if (!variant) return 0;
        return Number(variant.stockQuantity ?? variant.stock ?? 0) || 0;
    }
    return Number(product.stockQuantity) || 0;
}

export function shortOrderLabel(orderId?: string | null): string {
    return String(orderId || '').slice(0, 5).toUpperCase();
}

export function buildWhatsAppPaymentMessage(args: {
    userName?: string | null;
    orderId?: string | null;
    items: Array<{ name: string; quantity: number }>;
    total: number;
    payUrl: string;
    tillNumber?: string;
}): string {
    const name = String(args.userName || 'Farmer').trim() || 'Farmer';
    const id = shortOrderLabel(args.orderId);
    const lines = args.items.map((item) => `• ${item.name} x${item.quantity}`).join('\n');
    const till = args.tillNumber || process.env.MPESA_TILL_NUMBER || process.env.NEXT_PUBLIC_MPESA_TILL_NUMBER || '3130847';
    const amount = Number(args.total) || 0;
    return [
        `Habari ${name}! Your Mel-Agri order #${id} is ready to pay.`,
        '',
        lines,
        '',
        `Total: KES ${amount.toLocaleString()}`,
        `Pay here: ${args.payUrl}`,
        `Or Lipa na M-Pesa → Buy Goods → Till ${till} → KES ${amount.toLocaleString()}.`,
    ].join('\n');
}

export function whatsAppDraftUrl(phone: string, message: string): string {
    return getWhatsAppDirectUrl(promptPhone(phone), encodeURIComponent(message));
}

export function whatsAppDeliveryPlan(configured: boolean, phone: string, message: string):
    | { mode: 'twilio'; to: string; message: string }
    | { mode: 'draft'; url: string; message: string } {
    if (configured) {
        return { mode: 'twilio', to: promptPhone(phone), message };
    }
    return { mode: 'draft', url: whatsAppDraftUrl(phone, message), message };
}

export function whatsappDestination(order: { whatsappPhone?: string | null; phone?: string | null }): string {
    return String(order.whatsappPhone || order.phone || '').trim();
}
