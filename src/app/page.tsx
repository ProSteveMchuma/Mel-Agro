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
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <JsonLd />
      <Header />

      <main className="flex-grow">
        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-melagro-primary/95 to-melagro-secondary/95 text-white">
          <BannerCarousel />
        </div>

        {/* Smart Search Bar - Integrated into header now, but available on scroll */}
        <div className="sticky top-[64px] z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <div className="container-custom py-3">
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Search seeds, fertilizer, tools..."
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-melagro-primary/50 focus:border-transparent shadow-sm hover:border-gray-300 transition-all"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container-custom py-12 space-y-16">
          {/* Categories Section - Redesigned */}
          <section>
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Shop by Category</h2>
              <p className="text-gray-500 text-lg">Everything you need for a successful harvest</p>
            </div>
            <CategoryIcons />
          </section>

          {/* Flash Sale */}
          <FlashSaleStrip />

          {/* Featured Products */}
          <section>
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Best Sellers</h2>
              <p className="text-gray-500">Trusted by thousands of farmers across Kenya</p>
            </div>
            <ProductRow title="" filter={(p) => p.price > 2000} />
          </section>

          {/* Promo Banner - Enhanced Design */}
          <section className="relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-lg group">
            <img 
              src="https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=1400&auto=format&fit=crop" 
              alt="Premium Seeds" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent flex flex-col justify-center px-8 md:px-16">
              <div>
                <p className="text-melagro-accent font-semibold text-sm md:text-base uppercase tracking-wider mb-3">Limited Time Offer</p>
                <h3 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">Premium<br />Seeds Collection</h3>
                <p className="text-gray-100 text-lg mb-6 max-w-md">High germination rates and superior quality. Plant with confidence this season.</p>
                <button className="bg-melagro-accent hover:bg-melagro-accent/90 text-melagro-primary px-8 py-3 rounded-full font-bold transition-all hover:shadow-lg hover:scale-105 inline-block">
                  Explore Seeds →
                </button>
              </div>
            </div>
          </section>

          {/* New Arrivals */}
          <section>
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">New Arrivals</h2>
              <p className="text-gray-500">Latest additions to our catalog</p>
            </div>
            <ProductRow title="" filter={(p) => true} />
          </section>

          {/* Garden Essentials */}
          <section>
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Garden Essentials</h2>
              <p className="text-gray-500">Professional tools for modern farming</p>
            </div>
            <ProductRow title="" filter={(p) => p.category === 'Tools'} />
          </section>
        </div>

        {/* Partners Section */}
        <div className="bg-gray-50 border-t border-gray-100 py-12 mt-16">
          <Partners />
        </div>
      </main>

      <Footer />
    </div>
  );
}
