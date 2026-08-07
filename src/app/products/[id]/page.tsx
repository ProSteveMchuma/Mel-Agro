import { Metadata } from 'next';
import ProductDetails from '@/components/ProductDetails';
import { getProductByIdServerCached, getRelatedProductsCached, getSafeCoPurchaseProductsCached } from '@/lib/products-server';
import { absoluteUrl, SITE_URL } from '@/lib/site';
import { notFound, permanentRedirect } from 'next/navigation';
import { productIdFromRouteParam, productSeoPath, productSeoSlug } from '@/lib/seo';

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const product = await getProductByIdServerCached(productIdFromRouteParam(id));
    
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
    const canonicalPath = productSeoPath(product);

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
            url: absoluteUrl(canonicalPath),
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
            canonical: absoluteUrl(canonicalPath),
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
    const product = await getProductByIdServerCached(productIdFromRouteParam(id));
    if (!product) notFound();
    const canonicalSlug = productSeoSlug(product);
    if (id !== canonicalSlug) permanentRedirect(productSeoPath(product));
    const productId = String(product.id);
    const canonicalPath = productSeoPath(product);
    const [relatedProducts, complementProducts] = await Promise.all([
        getRelatedProductsCached(product.category, productId),
        getSafeCoPurchaseProductsCached(productId, product.category),
    ]);

    // Firestore timestamps and class instances cannot cross the Server/Client boundary.
    // Product fields used by the storefront are plain JSON values after normalization.
    const initialProduct = JSON.parse(JSON.stringify(product));
    const initialRelatedProducts = JSON.parse(JSON.stringify(relatedProducts));
    const initialComplementProducts = JSON.parse(JSON.stringify(complementProducts));

    const productImages = (product.images?.length ? product.images : [product.image])
        .filter(Boolean)
        .map(image => image.startsWith('http') ? image : absoluteUrl(image));

    const offerFor = (price: number, availability: boolean, sku?: string, variantId?: string) => ({
        '@type': 'Offer',
        price,
        priceCurrency: 'KES',
        availability: availability ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: `${absoluteUrl(canonicalPath)}${variantId ? `?variant=${encodeURIComponent(variantId)}` : ''}`,
        itemCondition: 'https://schema.org/NewCondition',
        ...(sku ? { sku } : {}),
        seller: { '@id': `${SITE_URL}/#store` },
        hasMerchantReturnPolicy: { '@id': `${SITE_URL}/#return-policy` },
        shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'KE' },
            deliveryTime: {
                '@type': 'ShippingDeliveryTime',
                handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
                transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 5, unitCode: 'DAY' },
            },
        },
    });
    const productOffers = product.variants?.length
        ? product.variants.map(variant => offerFor(Number(variant.price ?? product.price), Number(variant.stockQuantity) > 0, variant.sku, variant.id))
        : offerFor(Number(product.price), Boolean(product.inStock && Number(product.stockQuantity ?? product.stock ?? 0) > 0), product.productCode);

    const productJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${absoluteUrl(canonicalPath)}#product`,
        url: absoluteUrl(canonicalPath),
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
        offers: productOffers,
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
                item: absoluteUrl(canonicalPath),
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
                initialComplementProducts={initialComplementProducts}
                id={productId}
                initialProduct={initialProduct}
                initialRelatedProducts={initialRelatedProducts}
            />
        </>
    );
}
