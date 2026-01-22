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

    const ogImage = `/api/og/product?name=${encodeURIComponent(product.name)}&price=${product.price}&category=${encodeURIComponent(product.category)}&image=${encodeURIComponent(product.image)}`;

    return {
        title: `${product.name} - Buy High Quality ${product.category}`,
        description: description,
        keywords: [product.name, product.category, "Kenya", "Mel-Agro", "Agriculture"],
        openGraph: {
            title: `${product.name} | Mel-Agro Kenya`,
            description: description,
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: product.name,
                }
            ],
            type: 'website',
            siteName: 'Mel-Agro',
            locale: 'en_KE',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${product.name} | Mel-Agro`,
            description: description,
            images: [ogImage],
            site: '@melagro',
        },
        other: {
            'product:price:amount': product.price.toString(),
            'product:price:currency': 'KES',
            'product:availability': product.inStock ? 'instock' : 'oos',
            'product:category': product.category,
        }
    };
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    const product = await getProductById(id);

    const productJsonLd = product ? {
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
            url: `https://melagro.com/products/${id}`,
        },
    } : null;

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://melagro.com',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Products',
                item: 'https://melagro.com/products',
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: product?.name || 'Product',
                item: `https://melagro.com/products/${id}`,
            },
        ],
    };

    return (
        <>
            {productJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
                />
            )}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                <ProductDetails id={id} />
            </Suspense>
        </>
    );
}
