export type PackStock = {
    id?: string;
    name?: string;
    stockQuantity?: number;
    stock?: number;
};

function packQty(pack: PackStock) {
    return Math.max(0, Number(pack.stockQuantity ?? pack.stock) || 0);
}

/** Move one pack, then set the parent quantity to the sum of the packs. */
export function applyPackAdjustment<T extends PackStock>(packs: T[], variantId: string, adjustment: number): { packs: T[]; parentStock: number; packName: string; previous: number; next: number } {
    const index = packs.findIndex((pack) => String(pack.id) === variantId);
    if (index < 0) throw new Error("VARIANT_NOT_FOUND");
    const previous = packQty(packs[index]);
    const next = previous + adjustment;
    if (next < 0) throw new Error("NEGATIVE_STOCK");
    const updated = packs.map((pack, packIndex) => (
        packIndex === index
            ? { ...pack, stockQuantity: next }
            : { ...pack, stockQuantity: packQty(pack) }
    ));
    const parentStock = updated.reduce((sum, pack) => sum + Number(pack.stockQuantity || 0), 0);
    return { packs: updated, parentStock, packName: String(packs[index].name || "Pack"), previous, next };
}
