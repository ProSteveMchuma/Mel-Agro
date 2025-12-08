import { MetadataRoute } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://melagro.com';

    // Static routes
    const routes = [
        '',
        '/cart',
        '/auth/login',
        '/products',
        '/about',
        '/contact',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // Dynamic Product routes
    let productRoutes: any[] = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        productRoutes = querySnapshot.docs.map((doc) => ({
            url: `${baseUrl}/products/${doc.id}`,
            lastModified: new Date(), // Ideally this would come from doc data
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));
    } catch (error) {
        console.error("Error generating sitemap products:", error);
    }

    return [...routes, ...productRoutes];
}
