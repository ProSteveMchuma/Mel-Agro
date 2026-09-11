import { revalidatePath, revalidateTag } from 'next/cache';

/** Drop cached catalogue HTML/data so the next storefront request sees current stock. */
export function revalidateStorefrontCatalogue() {
    try {
        revalidateTag('products', 'max');
        revalidatePath('/', 'layout');
    } catch (error) {
        console.warn('[catalogue] failed to revalidate storefront cache', error);
    }
}
