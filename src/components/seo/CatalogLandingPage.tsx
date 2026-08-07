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
};

export default function CatalogLandingPage({ eyebrow, title, summary, products, guidance, faq, relatedLinks }: Props) {
    const availableCount = products.filter(product => product.inStock && Number(product.stockQuantity ?? product.stock ?? 0) > 0).length;
    const brands = new Set(products.map(product => product.brand).filter(Boolean)).size;

    return <div className="min-h-screen bg-[#f7f8f3] text-gray-950">
        <Header />
        <main id="main-content">
            <section className="border-b border-emerald-950/10 bg-[#eef4e8]">
                <div className="container-custom grid gap-10 py-12 md:py-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)] lg:items-end">
                    <div className="max-w-4xl">
                        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                            <Link href="/" className="hover:underline">Home</Link><span aria-hidden="true" className="px-2">/</span><Link href="/products" className="hover:underline">Products</Link><span aria-hidden="true" className="px-2">/</span><span>{title}</span>
                        </nav>
                        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">{eyebrow}</p>
                        <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[.98] tracking-[-0.04em] text-gray-950 md:text-6xl">{title}</h1>
                        <p className="mt-6 max-w-3xl text-base leading-8 text-gray-650 md:text-lg">{summary}</p>
                    </div>
                    <aside aria-label="Catalogue evidence" className="grid grid-cols-3 divide-x divide-emerald-950/10 rounded-3xl border border-emerald-950/10 bg-white/75 p-5 shadow-sm">
                        <div className="px-3"><strong className="block text-2xl font-black text-emerald-800">{products.length}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Listed</span></div>
                        <div className="px-3"><strong className="block text-2xl font-black text-emerald-800">{availableCount}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Available</span></div>
                        <div className="px-3"><strong className="block text-2xl font-black text-emerald-800">{brands}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Brands</span></div>
                    </aside>
                </div>
            </section>

            <section className="container-custom py-12 md:py-16" aria-labelledby="catalog-heading">
                <div className="flex flex-wrap items-end justify-between gap-5">
                    <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Live catalogue</p><h2 id="catalog-heading" className="mt-2 text-3xl font-black tracking-tight">Compare products</h2></div>
                    <Link href="/products" className="rounded-full border border-gray-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-800 hover:border-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Open all filters</Link>
                </div>
                {products.length ? <div className="mt-8 grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
                    {products.map(product => <ProductCard key={String(product.id)} {...product} id={product.id} />)}
                </div> : <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-8"><h3 className="font-black text-amber-950">No products are listed here yet</h3><p className="mt-2 text-sm text-amber-900">Browse the full catalogue or contact Mel-Agri for current availability.</p></div>}
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
