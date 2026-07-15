import { MetadataRoute } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getGuides } from '@/lib/guides';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1.0 },
        { url: `${SITE_URL}/products`, changeFrequency: 'daily', priority: 0.9 },
        { url: `${SITE_URL}/guides`, changeFrequency: 'weekly', priority: 0.85 },
        { url: `${SITE_URL}/services`, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${SITE_URL}/bulk`, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${SITE_URL}/delivery`, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${SITE_URL}/shipping`, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${SITE_URL}/returns`, changeFrequency: 'yearly', priority: 0.4 },
        { url: `${SITE_URL}/help`, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    ];

    let productRoutes: MetadataRoute.Sitemap = [];
    let categoryRoutes: MetadataRoute.Sitemap = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        productRoutes = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const updated = data.updatedAt ? new Date(data.updatedAt) : null;
            return {
                url: `${SITE_URL}/products/${doc.id}`,
                ...(updated && !isNaN(updated.getTime()) ? { lastModified: updated } : {}),
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
            url: `${SITE_URL}/products?category=${encodeURIComponent(category)}`,
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
            url: `${SITE_URL}/guides/${g.slug}`,
            ...(g.updatedAt ? { lastModified: new Date(g.updatedAt) } : {}),
            changeFrequency: 'monthly' as const,
            priority: 0.65,
        }));
    } catch (error) {
        console.error("Error generating guide sitemap entries:", error);
    }

    return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...guideRoutes];
}
