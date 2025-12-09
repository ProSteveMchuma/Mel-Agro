"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import BannerCarousel from "@/components/BannerCarousel";
import CategoryIcons from "@/components/CategoryIcons";
import FlashSaleStrip from "@/components/FlashSaleStrip";
import Partners from "@/components/Partners";
import ProductRow from "@/components/ProductRow";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <JsonLd />
      <Header />

      <main className="flex-grow">
        {/* Mobile-style Search Header */}
        <div className="bg-melagro-primary text-white py-3 sticky top-[var(--header-height)] z-20 shadow-md">
          <div className="container-custom">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for seeds, tools, fertilizer..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-melagro-accent shadow-sm"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
        </div>

        <div className="container-custom py-4 space-y-2">
          <BannerCarousel />
          <CategoryIcons />
          <FlashSaleStrip />

          {/* Main Shop Rows */}
          <div className="mt-4 space-y-2">
            {/* Best Sellers */}
            <ProductRow title="Best Sellers" filter={(p) => p.price > 2000} />

            {/* Promo Banner Mid-Page */}
            <div className="my-8 relative h-40 md:h-56 rounded-xl overflow-hidden shadow-sm">
              {/* Use a public agriculture image available online for stability */}
              <img src="https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=1000&auto=format&fit=crop" alt="Seeds Promo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center flex-col text-white p-6 text-center">
                <h3 className="text-2xl font-bold mb-2">Certified Seeds Collection</h3>
                <p className="mb-4 text-sm md:text-base">High germination rates for a better harvest.</p>
                <button className="bg-white text-melagro-primary px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors">Shop Seeds</button>
              </div>
            </div>

            {/* New Arrivals */}
            <ProductRow title="New Arrivals" filter={(p) => true} />

            {/* Garden Essentials */}
            <ProductRow title="Garden Essentials" filter={(p) => p.category === 'Tools'} />
          </div>
        </div>

        <div className="bg-white py-8 border-t border-gray-100 mt-8">
          <Partners />
        </div>
      </main>

      <Footer />
    </div>
  );
}
