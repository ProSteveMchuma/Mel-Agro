const configuredUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.melagri.com';

/** The one canonical origin used by metadata, sitemaps, and structured data. */
export const SITE_URL = configuredUrl.replace(/\/$/, '');
export const SITE_NAME = 'Mel-Agri';
export const SITE_LOGO = `${SITE_URL}/icon-512x512.png`;
export const SITE_SOCIAL_IMAGE = `${SITE_URL}/images/kenyan-farmer-banner.png`;

export function absoluteUrl(path = '/') {
    return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
