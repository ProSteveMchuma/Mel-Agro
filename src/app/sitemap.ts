import { MetadataRoute } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getGuides } from '@/lib/guides';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.melagri.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = SITE_URL.replace(/\/$/, '');
    const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
        { url: `${baseUrl}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/bulk`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/delivery`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/shipping`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/returns`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
        { url: `${baseUrl}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/auth/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/auth/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    ];

    let productRoutes: MetadataRoute.Sitemap = [];
    let categoryRoutes: MetadataRoute.Sitemap = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        productRoutes = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const updated = data.updatedAt ? new Date(data.updatedAt) : now;
            return {
                url: `${baseUrl}/products/${doc.id}`,
                lastModified: isNaN(updated.getTime()) ? now : updated,
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            };
        });

        const categories = new Set<string>();
        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.category) categories.add(data.category);
        });
        categoryRoutes = Array.from(categories).map(category => ({
            url: `${baseUrl}/products?category=${encodeURIComponent(category)}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));
    } catch (error) {
        console.error("Error generating product sitemap entries:", error);
    }

    let guideRoutes: MetadataRoute.Sitemap = [];
    try {
        const guides = await getGuides();
        guideRoutes = (guides || []).map((g: any) => ({
            url: `${baseUrl}/guides/${g.slug}`,
            lastModified: g.updatedAt ? new Date(g.updatedAt) : now,
            changeFrequency: 'monthly' as const,
            priority: 0.65,
        }));
    } catch (error) {
        console.error("Error generating guide sitemap entries:", error);
    }

    return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...guideRoutes];
}
