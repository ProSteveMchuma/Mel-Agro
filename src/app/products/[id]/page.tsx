import { Metadata } from 'next';
import ProductDetails from '@/components/ProductDetails';
import { getProductById } from '@/lib/products';
import { Suspense } from 'react';

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
        return {
            title: 'Product Not Found | MelAgro',
            description: 'The product you are looking for is not available.',
        };
    }

    const description = (product.description || '').substring(0, 160);

    return {
        title: `${product.name} - Buy High Quality ${product.category}`,
        description: description,
        keywords: [product.name, product.category, "Kenya", "Mel-Agro", "Agriculture"],
        openGraph: {
            title: `${product.name} | Mel-Agro Kenya`,
            description: description,
            images: [product.image],
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${product.name} | Mel-Agro`,
            description: description,
            images: [product.image],
        }
    };
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    const product = await getProductById(id);

    const jsonLd = product ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.image,
        description: product.description || '',
        sku: product.id,
        offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'KES',
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
    } : null;

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                <ProductDetails id={id} />
            </Suspense>
        </>
    );
}
