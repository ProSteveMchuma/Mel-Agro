"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Hero from "@/components/Hero";
import ValueProps from "@/components/ValueProps";
import ProductRow from "@/components/ProductRow";
import Newsletter from "@/components/Newsletter";
import CategoryIcons from "@/components/CategoryIcons";
import FlashSaleStrip from "@/components/FlashSaleStrip";
import Partners from "@/components/Partners";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <JsonLd />
      <Header />

      <main className="flex-grow">
        <Hero />

        <div className="container-custom py-8 space-y-12">
          {/* Mobile-style Search - More Integrated */}
          <div className="md:hidden">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search for seeds, tools, fertilizer..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl text-gray-900 text-sm border-2 border-gray-100 focus:border-melagro-primary/30 focus:outline-none focus:ring-4 focus:ring-melagro-primary/5 transition-all shadow-sm"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 group-focus-within:text-melagro-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>

          <ValueProps />

          <section>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
                <p className="text-gray-500 text-sm">Find everything you need for your farm</p>
              </div>
            </div>
            <CategoryIcons />
          </section>

          <FlashSaleStrip />

          {/* Main Shop Rows */}
          <div className="space-y-12">
            {/* Best Sellers */}
            <ProductRow title="Featured Products" filter={(p) => p.rating >= 4} />

            {/* Promo Banner Mid-Page */}
            <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl group">
              <img src="https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=1200&auto=format&fit=crop" alt="Seeds Promo" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center p-8 md:p-16">
                <div className="max-w-md text-white">
                  <span className="inline-block px-3 py-1 bg-melagro-secondary text-white text-xs font-bold rounded-full mb-4">CERTIFIED QUALITY</span>
                  <h3 className="text-3xl md:text-4xl font-bold mb-4">Certified Seeds for High Yield</h3>
                  <p className="mb-8 text-gray-200">Our seeds are laboratory tested and certified for 98% germination rate. Start your season with the best.</p>
                  <button className="bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-melagro-secondary hover:text-white transition-all transform hover:scale-105 shadow-lg">Shop Seeds Collection</button>
                </div>
              </div>
            </div>

            {/* New Arrivals */}
            <ProductRow title="New Arrivals" filter={(p) => true} />

            {/* Garden Essentials */}
            <ProductRow title="Garden Essentials" filter={(p) => p.category === 'Tools' || p.category === 'Equipments'} />
          </div>
        </div>

        <div className="bg-gray-50 py-16">
          <Newsletter />
        </div>

        <div className="bg-white py-12 border-t border-gray-100">
          <Partners />
        </div>
      </main>

      <Footer />
    </div>
  );
}
