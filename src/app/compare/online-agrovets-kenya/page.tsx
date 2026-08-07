import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { absoluteUrl } from '@/lib/site';

const competitors = [
    { name: 'Farmers Trend Virtual Agrovet', url: 'https://agrovet.farmerstrend.co.ke/' },
    { name: 'MyAgroVet', url: 'https://www.myagrovet.co.ke/' },
    { name: 'AgroDuka', url: 'https://agroduka.com/' },
    { name: 'Lukenya Agrovet', url: 'https://lukenyaagrovet.co.ke/' },
] as const;

export const metadata: Metadata = {
    title: 'Compare Online Agrovets in Kenya: A Practical Buyer Guide',
    description: 'Compare Mel-Agri with Farmers Trend Virtual Agrovet, MyAgroVet, AgroDuka and Lukenya Agrovet using price, stock, delivery, payment, returns and support checks.',
    alternates: { canonical: '/compare/online-agrovets-kenya' },
    keywords: ['Mel-Agri', 'Farmers Trend Virtual Agrovet', 'MyAgroVet Kenya', 'AgroDuka Kenya', 'Lukenya Agrovet', 'online agrovet Kenya comparison', 'AgroDuka alternative', 'MyAgroVet alternative'],
    openGraph: { title: 'How to Compare Online Agrovets in Kenya', description: 'A transparent checklist for comparing farm-input shops before ordering.', url: '/compare/online-agrovets-kenya', type: 'article', images: ['/images/kenyan-farmer-banner.png'] },
};

const factors = [
    ['Current price', 'Use the price shown for the exact pack or variant, then add delivery cost. Avoid comparing different pack sizes.'],
    ['Stock evidence', 'Confirm that the specific variant is available now, not merely listed in the catalogue.'],
    ['Delivery promise', 'Ask for the county-specific charge, dispatch point, and delivery range before paying.'],
    ['Payment verification', 'Use a payment method tied to an order reference and retain the provider confirmation.'],
    ['Product identity', 'Check manufacturer, product code, pack seal, registered label, and expiry where applicable.'],
    ['Returns and support', 'Read the return conditions and confirm how order, delivery, or product problems are escalated.'],
] as const;

export default function OnlineAgrovetsComparisonPage() {
    const canonical = absoluteUrl('/compare/online-agrovets-kenya');
    const articleJsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: 'How to compare online agrovets in Kenya', description: 'A practical, independent checklist for comparing agricultural-input ecommerce shops in Kenya.', datePublished: '2026-08-07', dateModified: '2026-08-07', author: { '@type': 'Organization', name: 'Mel-Agri' }, publisher: { '@id': `${absoluteUrl('/')}#store` }, mainEntityOfPage: canonical, about: competitors.map(item => ({ '@type': 'Organization', name: item.name, url: item.url })) };

    return <div className="min-h-screen bg-[#f7f8f3] text-gray-950">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <Header />
        <main>
            <article>
                <header className="border-b border-emerald-950/10 bg-[#eef4e8]">
                    <div className="container-custom py-14 md:py-20">
                        <nav aria-label="Breadcrumb" className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800"><Link href="/">Home</Link><span className="px-2">/</span><span>Compare online agrovets</span></nav>
                        <p className="mt-10 text-xs font-black uppercase tracking-[0.28em] text-emerald-700">Independent buying checklist</p>
                        <h1 className="mt-4 max-w-5xl text-4xl font-black leading-[.98] tracking-[-0.04em] md:text-6xl">How to compare online agrovets in Kenya</h1>
                        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">Farmers comparing Mel-Agri, Farmers Trend Virtual Agrovet, MyAgroVet, AgroDuka, Lukenya Agrovet, or another supplier should assess the same evidence before ordering. This guide provides a transparent framework without claiming that one shop is always best.</p>
                        <p className="mt-5 max-w-3xl rounded-2xl border border-emerald-900/10 bg-white/70 p-4 text-xs leading-5 text-gray-600"><strong>Independence notice:</strong> Mel-Agri is not affiliated with or endorsed by the other businesses named here. Names belong to their respective owners. Competitor services, prices and policies can change; verify current information on each official website.</p>
                    </div>
                </header>

                <section className="container-custom grid gap-10 py-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)] lg:py-20">
                    <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Six checks that matter</p><h2 className="mt-2 text-3xl font-black tracking-tight">Compare evidence, not advertisements</h2><div className="mt-8 grid gap-4 md:grid-cols-2">{factors.map(([title, detail], index) => <section key={title} className="rounded-3xl border border-gray-200 bg-white p-6"><span className="text-xs font-black text-emerald-700">0{index + 1}</span><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{detail}</p></section>)}</div></div>
                    <aside className="rounded-3xl bg-emerald-950 p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Sites shoppers may compare</p><ul className="mt-5 space-y-3">{competitors.map(item => <li key={item.url}><a href={item.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-sm font-bold hover:border-emerald-300"><span>{item.name}</span><span aria-hidden="true">↗</span></a></li>)}</ul><p className="mt-5 text-xs leading-5 text-emerald-100/70">Links are provided so readers can verify current competitor information directly.</p></aside>
                </section>

                <section className="border-y border-gray-200 bg-white"><div className="container-custom py-14 md:py-20"><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">What Mel-Agri provides</p><h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight">Evidence available before checkout</h2><div className="mt-8 grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-[#f7f8f3] p-6"><h3 className="font-black">Live catalogue detail</h3><p className="mt-2 text-sm leading-6 text-gray-600">Product, brand, pack, price and current availability are presented on the relevant listing.</p></div><div className="rounded-2xl bg-[#f7f8f3] p-6"><h3 className="font-black">County delivery estimate</h3><p className="mt-2 text-sm leading-6 text-gray-600">Checkout calculates the delivery charge and expected range for the selected county.</p></div><div className="rounded-2xl bg-[#f7f8f3] p-6"><h3 className="font-black">Order-linked payment</h3><p className="mt-2 text-sm leading-6 text-gray-600">M-Pesa payment status is connected to the order and provider callback rather than a customer-entered success claim.</p></div></div><div className="mt-8 flex flex-wrap gap-3"><Link href="/products" className="rounded-full bg-emerald-800 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700">Browse Mel-Agri products</Link><Link href="/delivery" className="rounded-full border border-gray-300 px-6 py-3 text-sm font-black text-gray-800 hover:border-emerald-700">Check delivery information</Link><Link href="/returns" className="rounded-full border border-gray-300 px-6 py-3 text-sm font-black text-gray-800 hover:border-emerald-700">Read return policy</Link></div></div></section>
            </article>
        </main>
        <Footer />
    </div>;
}
