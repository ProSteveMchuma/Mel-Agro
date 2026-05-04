import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.melagri.com';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = SITE_URL.replace(/\/$/, '');

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/dashboard/',
                    '/api/',
                    '/checkout/',
                    '/cart',
                    '/auth/verify',
                    '/admin-setup',
                    '/orders/',
                    '/wishlist',
                    '/billing',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
