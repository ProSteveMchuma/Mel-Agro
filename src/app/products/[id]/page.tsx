import { Metadata } from 'next';
import ProductDetails from '@/components/ProductDetails';
import { getProductById } from '@/lib/products';
import { Suspense } from 'react';

import { headers } from 'next/headers';

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const product = await getProductById(id);
    
    // Resolve dynamic domain
    const headersList = await headers();
    const domain = headersList.get('host') || 'melagri.co.ke';
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${domain}`;

    if (!product) {
        return {
            title: 'Product Not Found | Mel-Agri',
            description: 'The product you are looking for is not available.',
        };
    }

    const description = (product.description || '').substring(0, 160);
    const seoDescription = `Buy original ${product.name} online at Mel-Agro. ${description} Fast nationwide delivery in Kenya.`;

    const ogImage = `${baseUrl}/api/og/product?name=${encodeURIComponent(product.name)}&price=${product.price}&category=${encodeURIComponent(product.category)}&image=${encodeURIComponent(product.image)}`;

    return {
        title: `Buy ${product.name} Online - Fast Delivery in Kenya | Mel-Agro`,
        description: seoDescription,
        keywords: [product.name, product.category, `Buy ${product.name} Kenya`, `Buy ${product.category} online Kenya`, "Mel-Agro", "Certified Agrochemicals"],
        openGraph: {
            title: `Buy ${product.name} Online | Mel-Agro Kenya`,
            description: seoDescription,
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
            title: `Buy ${product.name} Online | Mel-Agro`,
            description: seoDescription,
            images: [ogImage],
            site: '@melagro',
        },
        other: {
            'product:price:amount': product.price.toString(),
            'product:price:currency': 'KES',
            'product:availability': product.inStock ? 'instock' : 'oos',
            'product:category': product.category,
        },
        alternates: {
            canonical: `${baseUrl}/products/${id}` // Force explicit canonical based on visited domain
        }
    };
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    const product = await getProductById(id);

    const headersList = await headers();
    const domain = headersList.get('host') || 'melagri.co.ke';

    const productJsonLd = product ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.image,
        description: product.description || '',
        sku: product.id,
        brand: {
            '@type': 'Brand',
            name: product.brand || 'Mel-Agro'
        },
        offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'KES',
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `https://${domain}/products/${id}`,
        },
        ...(product.rating ? {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                reviewCount: product.reviews || 1,
            }
        } : {})
    } : null;

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: `https://${domain}`,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Products',
                item: `https://${domain}/products`,
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: product?.name || 'Product',
                item: `https://${domain}/products/${id}`,
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
