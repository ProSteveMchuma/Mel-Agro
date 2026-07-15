import { Metadata } from 'next';
import ProductDetails from '@/components/ProductDetails';
import { getProductById } from '@/lib/products';
import { Suspense } from 'react';
import { absoluteUrl, SITE_URL } from '@/lib/site';
import { notFound } from 'next/navigation';

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const product = await getProductById(id);
    
    if (!product) {
        return {
            title: 'Product Not Found | Mel-Agri',
            description: 'The product you are looking for is not available.',
            robots: { index: false, follow: false },
        };
    }

    const description = (product.description || '').substring(0, 150);
    const seoDescription = `Buy original ${product.name} online at Mel-Agri Kenya for KES ${product.price.toLocaleString()}. Certified ${product.category} with fast farm delivery to Nakuru, Eldoret, Kisumu, Nairobi, and countrywide. ${description}`;

    const ogImage = `${SITE_URL}/api/og/product?name=${encodeURIComponent(product.name)}&price=${product.price}&category=${encodeURIComponent(product.category)}&image=${encodeURIComponent(product.image)}`;

    const keywords = [
        product.name,
        product.brand || "",
        product.category,
        `Buy ${product.name} online`,
        `Original ${product.name} price Kenya`,
        `Where to buy ${product.name}`,
        `Certified ${product.category} Kenya`,
        `Buy ${product.name} Nairobi`,
        `Buy ${product.name} Nakuru`,
        `Buy ${product.name} Eldoret`,
        `Mel-Agri products`,
        "certified agrovet Kenya",
        "agricultural inputs online"
    ].filter(Boolean);

    return {
        title: `Buy ${product.name} Online - Fast Delivery in Kenya | Mel-Agri`,
        description: seoDescription,
        keywords,
        openGraph: {
            title: `Buy ${product.name} Online | Mel-Agri Kenya`,
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
            siteName: 'Mel-Agri',
            locale: 'en_KE',
        },
        twitter: {
            card: 'summary_large_image',
            title: `Buy ${product.name} Online | Mel-Agri`,
            description: seoDescription,
            images: [ogImage],
            site: '@melagri',
        },
        other: {
            'product:price:amount': product.price.toString(),
            'product:price:currency': 'KES',
            'product:availability': product.inStock ? 'instock' : 'oos',
            'product:category': product.category,
        },
        alternates: {
            canonical: absoluteUrl(`/products/${id}`),
        }
    };
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) notFound();

    const productImages = (product.images?.length ? product.images : [product.image])
        .filter(Boolean)
        .map(image => image.startsWith('http') ? image : absoluteUrl(image));

    const productJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: productImages,
        description: product.description || '',
        sku: product.id,
        mpn: product.productCode || product.id,
        brand: {
            '@type': 'Brand',
            name: product.brand || 'Mel-Agri'
        },
        offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'KES',
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: absoluteUrl(`/products/${id}`),
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@id': `${SITE_URL}/#store` },
        },
        ...(product.rating && Number(product.reviews) > 0 ? {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                reviewCount: product.reviews,
            }
        } : {})
    };

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: SITE_URL,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Products',
                item: absoluteUrl('/products'),
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: product?.name || 'Product',
                item: absoluteUrl(`/products/${id}`),
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
            />
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
