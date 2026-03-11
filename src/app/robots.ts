import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://Mel-Agri.com';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/api/', '/checkout/', '/cart/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
