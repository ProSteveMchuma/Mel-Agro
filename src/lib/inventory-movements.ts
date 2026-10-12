export type MovementRow = {
    type?: string | null;
    reason?: string | null;
    note?: string | null;
    updatedBy?: string | null;
    change?: number | null;
    variantId?: string | null;
};

export type MovementPack = { id?: string | null; name?: string | null };

/** The five reasons staff read on the product, plus the words they pick when counting. */
export function movementReason(row: MovementRow): string {
    const reason = String(row.reason || row.note || '').toLowerCase();
    if (reason.includes('counted')) return 'counted';
    if (reason.includes('damaged')) return 'damaged';
    if (reason === 'received' || reason.startsWith('received')) return 'received';
    const type = String(row.type || '').toLowerCase();
    if (type === 'goods_arrived' || reason.includes('goods arrived')) return 'goods arrived';
    if (type === 'return' || reason.includes('return')) return 'return';
    if (type === 'cancellation' || type === 'reservation_expired' || reason.includes('cancel')) return 'cancel';
    if (type === 'admin_adjustment' || type === 'product_edit' || type === 'initial') return 'adjustment';
    if (type === 'sale') return 'sale';
    if (!type && Number(row.change) < 0) return 'sale';
    return 'adjustment';
}

export function movementPackName(row: MovementRow, packs: MovementPack[] = []): string {
    const id = String(row.variantId || '').trim();
    if (!id) return '';
    const pack = packs.find((item) => String(item.id || '') === id);
    return String(pack?.name || '').trim();
}
