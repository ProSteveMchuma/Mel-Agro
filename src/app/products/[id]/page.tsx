import { Metadata } from 'next';
import ProductDetails from '@/components/ProductDetails';
import { getProductById } from '@/lib/products';

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

    return {
        title: `${product.name} | MelAgro`,
        description: product.description.substring(0, 160),
        openGraph: {
            title: `${product.name} | MelAgro`,
            description: product.description.substring(0, 160),
            images: [product.image],
        },
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
        description: product.description,
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
            <ProductDetails id={id} />
        </>
    );
}
