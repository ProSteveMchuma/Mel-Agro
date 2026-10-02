const configuredUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.melagri.com';

/** The one canonical origin used by metadata, sitemaps, and structured data. */
export const SITE_URL = configuredUrl.replace(/\/$/, '');
export const SITE_NAME = 'Mel-Agri';
export const SITE_LOGO = `${SITE_URL}/icon-512x512.png`;
export const SITE_SOCIAL_IMAGE = `${SITE_URL}/images/melagri-social.jpg`;
export const SITE_DESCRIPTION = 'Mel-Agri, the online shop of Makamithi Enterprises Ltd in Machakos. Certified seeds, fertilizers, and crop protection, delivered across Kenya.';

/**
 * Head office published on https://makamithi.com (checked 2 October 2026).
 * Main shop: Mbitini House, Mbolu Malu Road, Machakos.
 */
export const COMPANY_STREET = 'Makamithi House, Industrial Area (next to KIE)';
export const COMPANY_LOCALITY = 'Machakos';
export const COMPANY_REGION = 'Machakos County';
export const COMPANY_POSTAL_CODE = '90100';
export const COMPANY_PO_BOX = 'P.O. Box 1817-90100';
export const COMPANY_MAIN_SHOP = 'Mbitini House, Mbolu Malu Road, Machakos';
export const COMPANY_ADDRESS_SHORT = 'Makamithi House, Industrial Area, Machakos';

export function absoluteUrl(path = '/') {
    return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Support / contact details. Centralised here (with env overrides) so the
 * business phone, WhatsApp line and Till number are configured in one place
 * instead of being hard-coded across the UI.
 */
export const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '254788970757').replace(/\D/g, '');
export const SUPPORT_PHONE_E164 = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+254788970757';
export const SUPPORT_PHONE_DISPLAY = process.env.NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY || '0788 970757';

/** Storefront display of the M-Pesa Till (Buy Goods) number. */
export const MPESA_TILL_DISPLAY = process.env.NEXT_PUBLIC_MPESA_TILL_NUMBER || '3130847';

/** Build a wa.me link. Pass raw (unencoded) text; it will be encoded here. */
export function whatsAppUrl(rawText?: string) {
    const base = `https://wa.me/${SUPPORT_WHATSAPP}`;
    return rawText ? `${base}?text=${encodeURIComponent(rawText)}` : base;
}
