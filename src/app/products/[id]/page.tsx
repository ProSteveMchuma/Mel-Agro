import { Metadata } from 'next';
import ProductDetails from '@/components/ProductDetails';
import { getProductById } from '@/lib/products';
import { getRelatedProductsCached } from '@/lib/products-server';
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
            title: 'Product Not Found',
            description: 'The product you are looking for is not available.',
            robots: { index: false, follow: false },
        };
    }

    const productSummary = (product.description || `Certified ${product.category} available for delivery across Kenya.`)
        .replace(/\s+/g, ' ')
        .trim();
    const seoDescription = `Buy ${product.name} online in Kenya for KES ${product.price.toLocaleString()}. ${productSummary}`.slice(0, 158).trim();

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
        title: { absolute: `Buy ${product.name} Online in Kenya | Mel-Agri` },
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
            url: absoluteUrl(`/products/${id}`),
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
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-image-preview': 'large',
                'max-snippet': -1,
                'max-video-preview': -1,
            },
        },
    };
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) notFound();
    const relatedProducts = await getRelatedProductsCached(product.category, String(product.id));

    // Firestore timestamps and class instances cannot cross the Server/Client boundary.
    // Product fields used by the storefront are plain JSON values after normalization.
    const initialProduct = JSON.parse(JSON.stringify(product));
    const initialRelatedProducts = JSON.parse(JSON.stringify(relatedProducts));

    const productImages = (product.images?.length ? product.images : [product.image])
        .filter(Boolean)
        .map(image => image.startsWith('http') ? image : absoluteUrl(image));

    const productJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${absoluteUrl(`/products/${id}`)}#product`,
        url: absoluteUrl(`/products/${id}`),
        name: product.name,
        image: productImages,
        description: product.description || '',
        sku: product.productCode || String(product.id),
        ...(product.productCode ? { mpn: product.productCode } : {}),
        category: product.category,
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
            <ProductDetails
                id={id}
                initialProduct={initialProduct}
                initialRelatedProducts={initialRelatedProducts}
            />
        </>
    );
}
