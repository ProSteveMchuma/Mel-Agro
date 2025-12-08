import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://melagro.com';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/admin/', '/api/', '/checkout/success'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
