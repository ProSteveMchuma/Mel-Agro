import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CatalogLandingPage from '@/components/seo/CatalogLandingPage';
import { getProductsByTaxonomyCached, getUniqueBrandsCached } from '@/lib/products-server';
import { absoluteUrl } from '@/lib/site';
import { productSeoPath, resolveSeoValue, slugifySeoValue } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

// Refresh brand landing pages hourly (ISR) so new products, prices and stock
// appear without a redeploy.
export const revalidate = 3600;

export async function generateStaticParams() {
    return (await getUniqueBrandsCached()).map(brand => ({ slug: slugifySeoValue(brand) }));
}

async function brandFor(slug: string) { return resolveSeoValue(slug, await getUniqueBrandsCached()); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const brand = await brandFor(slug);
    if (!brand) return { title: 'Brand Not Found', robots: { index: false, follow: false } };
    const canonical = `/brands/${slugifySeoValue(brand)}`;
    const title = `${brand} Agricultural Products in Kenya`;
    const description = `Compare ${brand} agricultural products available from Mel-Agri, including current prices, pack options, stock status, and delivery across Kenya.`;
    return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: 'website', images: ['/images/kenyan-farmer-banner.png'] } };
}

export default async function BrandPage({ params }: Props) {
    const { slug } = await params;
    const brands = await getUniqueBrandsCached();
    const brand = resolveSeoValue(slug, brands);
    if (!brand) notFound();
    const products = await getProductsByTaxonomyCached('brand', brand, 12);
    const canonical = `/brands/${slugifySeoValue(brand)}`;
    const summary = `Explore ${brand} products in the live Mel-Agri catalogue. Compare product purpose, pack options, current price, availability, and delivery information before ordering.`;
    const guidance = ['Confirm the brand, product name, and intended use.', 'Compare pack options, specifications, stock, and delivered cost.', 'For regulated or safety-sensitive products, follow the registered label and qualified professional advice.'];
    const faq = [{ question: `Are ${brand} prices shown online?`, answer: 'Yes. Each listing shows the current catalogue price and available pack variants, subject to stock updates.' }, { question: `Can ${brand} products be delivered across Kenya?`, answer: 'Eligible stocked products can be delivered countrywide. Checkout shows the charge and estimated delivery range for the selected county.' }];
    const graph = { '@context': 'https://schema.org', '@type': 'CollectionPage', url: absoluteUrl(canonical), name: `${brand} agricultural products in Kenya`, description: summary, mainEntity: { '@type': 'ItemList', numberOfItems: products.length, itemListElement: products.map((product, index) => ({ '@type': 'ListItem', position: index + 1, url: absoluteUrl(productSeoPath(product)), name: product.name })) } };
    const relatedLinks = brands.filter(item => item !== brand).slice(0, 6).map(item => ({ label: item, href: `/brands/${slugifySeoValue(item)}` }));
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} /><CatalogLandingPage eyebrow="Shop by manufacturer" title={`${brand} products`} summary={summary} products={products} guidance={guidance} faq={faq} relatedLinks={relatedLinks} /></>;
}
