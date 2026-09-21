import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types';

type Props = {
    eyebrow: string;
    title: string;
    summary: string;
    products: Product[];
    guidance: string[];
    faq: Array<{ question: string; answer: string }>;
    relatedLinks: Array<{ label: string; href: string }>;
    /** Deep-link into /products with category or brand preselected. */
    filtersHref?: string;
};

export default function CatalogLandingPage({
    eyebrow,
    title,
    summary,
    products,
    guidance,
    faq,
    relatedLinks,
    filtersHref = '/products',
}: Props) {
    return <div className="min-h-screen bg-[#f7f8f3] text-gray-950">
        <Header />
        <main id="main-content">
            {/* Compact heading — keeps the H1/summary for SEO but lets the
                products appear immediately instead of behind a large hero. */}
            <section className="container-custom pt-6 pb-2 md:pt-8" aria-labelledby="catalog-heading">
                <nav aria-label="Breadcrumb" className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">
                    <Link href="/" className="hover:underline">Home</Link><span aria-hidden="true" className="px-2">/</span><Link href="/products" className="hover:underline">Products</Link><span aria-hidden="true" className="px-2">/</span><span className="text-gray-500">{title}</span>
                </nav>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">{eyebrow}</p>
                        <h1 id="catalog-heading" className="mt-1 text-2xl font-black tracking-tight text-gray-950 md:text-4xl">{title}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-500">{products.length} {products.length === 1 ? 'product' : 'products'}</span>
                        <Link href={filtersHref} className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wider text-gray-800 hover:border-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">All filters</Link>
                    </div>
                </div>
                {summary && <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">{summary}</p>}
            </section>

            <section className="container-custom pb-12 pt-4 md:pb-16">
                {products.length ? <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
                    {products.map(product => <ProductCard key={String(product.id)} {...product} id={product.id} />)}
                </div> : <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8"><h3 className="font-black text-amber-950">No products are listed here yet</h3><p className="mt-2 text-sm text-amber-900">Browse the full catalogue or contact Mel-Agri for current availability.</p></div>}
            </section>

            <section className="border-y border-gray-200 bg-white">
                <div className="container-custom grid gap-10 py-14 lg:grid-cols-2 lg:py-20">
                    <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Before you choose</p><h2 className="mt-2 text-3xl font-black tracking-tight">A more informed purchase</h2><ol className="mt-7 space-y-4">{guidance.map((item, index) => <li key={item} className="flex gap-4 rounded-2xl bg-[#f7f8f3] p-5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-black text-white">{index + 1}</span><span className="pt-1 text-sm font-medium leading-6 text-gray-700">{item}</span></li>)}</ol></div>
                    <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Useful answers</p><h2 className="mt-2 text-3xl font-black tracking-tight">Questions farmers ask</h2><div className="mt-7 divide-y divide-gray-200 border-y border-gray-200">{faq.map(item => <details key={item.question} className="group py-5"><summary className="cursor-pointer list-none pr-8 font-black text-gray-900 marker:hidden">{item.question}</summary><p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">{item.answer}</p></details>)}</div></div>
                </div>
            </section>

            <section className="container-custom py-12"><h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">Continue exploring</h2><div className="mt-4 flex flex-wrap gap-3">{relatedLinks.map(link => <Link key={link.href} href={link.href} className="rounded-full bg-emerald-950 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{link.label}</Link>)}</div></section>
        </main>
        <Footer />
    </div>;
}
