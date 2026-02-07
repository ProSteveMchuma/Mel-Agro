import { MetadataRoute } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://Mel-Agri.com';

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
    let categoryRoutes: any[] = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        productRoutes = querySnapshot.docs.map((doc) => ({
            url: `${baseUrl}/products/${doc.id}`,
            lastModified: new Date(), // Ideally this would come from doc data
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));

        // Extract unique categories from products
        const categories = new Set<string>();
        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.category) {
                categories.add(data.category);
            }
        });

        categoryRoutes = Array.from(categories).map(category => ({
            url: `${baseUrl}/products?category=${encodeURIComponent(category)}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));

    } catch (error) {
        console.error("Error generating sitemap products/categories:", error);
    }

    return [...routes, ...categoryRoutes, ...productRoutes];
}
