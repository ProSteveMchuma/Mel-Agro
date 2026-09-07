import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CatalogLandingPage from '@/components/seo/CatalogLandingPage';
import { getProductsByTaxonomyCached, getUniqueCategoriesCached } from '@/lib/products-server';
import { absoluteUrl } from '@/lib/site';
import { categoryEditorial, productSeoPath, resolveSeoValue, slugifySeoValue } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

// Refresh category landing pages hourly (ISR) so new products, prices and
// stock appear without a redeploy.
export const revalidate = 3600;

export async function generateStaticParams() {
    return (await getUniqueCategoriesCached()).map(category => ({ slug: slugifySeoValue(category) }));
}

async function categoryFor(slug: string) {
    return resolveSeoValue(slug, await getUniqueCategoriesCached());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const category = await categoryFor(slug);
    if (!category) return { title: 'Category Not Found', robots: { index: false, follow: false } };
    const editorial = categoryEditorial(category);
    const canonical = `/categories/${slugifySeoValue(category)}`;
    const title = `${category} in Kenya — Compare Products & Prices`;
    const description = editorial.summary.slice(0, 158);
    return { title, description, alternates: { canonical }, openGraph: { title, description, type: 'website', url: canonical, images: ['/images/kenyan-farmer-banner.png'] } };
}

export default async function CategoryPage({ params }: Props) {
    const { slug } = await params;
    const categories = await getUniqueCategoriesCached();
    const category = resolveSeoValue(slug, categories);
    if (!category) notFound();
    const products = await getProductsByTaxonomyCached('category', category, 200);
    const editorial = categoryEditorial(category);
    const canonical = `/categories/${slugifySeoValue(category)}`;
    const graph = { '@context': 'https://schema.org', '@graph': [{ '@type': 'CollectionPage', '@id': `${absoluteUrl(canonical)}#page`, url: absoluteUrl(canonical), name: `${category} in Kenya`, description: editorial.summary, breadcrumb: { '@id': `${absoluteUrl(canonical)}#breadcrumbs` }, mainEntity: { '@type': 'ItemList', numberOfItems: products.length, itemListElement: products.map((product, index) => ({ '@type': 'ListItem', position: index + 1, url: absoluteUrl(productSeoPath(product)), name: product.name })) } }, { '@type': 'BreadcrumbList', '@id': `${absoluteUrl(canonical)}#breadcrumbs`, itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') }, { '@type': 'ListItem', position: 2, name: 'Products', item: absoluteUrl('/products') }, { '@type': 'ListItem', position: 3, name: category, item: absoluteUrl(canonical) }] }, { '@type': 'FAQPage', mainEntity: editorial.faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }] };
    const relatedLinks = categories.filter(item => item !== category).slice(0, 6).map(item => ({ label: item, href: `/categories/${slugifySeoValue(item)}` }));
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} /><CatalogLandingPage eyebrow={editorial.eyebrow} title={category} summary={editorial.summary} products={products} guidance={editorial.guidance} faq={editorial.faq} relatedLinks={relatedLinks} /></>;
}
