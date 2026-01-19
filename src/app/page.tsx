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
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
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

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Sidebar - Categories */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-8">
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4 px-2">Browse Categories</h3>
                  <nav className="space-y-1">
                    {[
                      "Seeds & Seedlings",
                      "Fertilizers",
                      "Crop Protection",
                      "Farm Tools",
                      "Irrigation",
                      "Animal Feeds",
                      "Vet Products"
                    ].map((cat, idx) => (
                      <Link
                        key={idx}
                        href={`/products?category=${encodeURIComponent(cat)}`}
                        className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-melagro-primary hover:bg-gray-50 transition-all"
                      >
                        {cat}
                      </Link>
                    ))}
                  </nav>
                </section>

                <div className="bg-gradient-to-br from-melagro-primary/10 to-melagro-secondary/10 p-5 rounded-3xl border border-melagro-primary/20">
                  <p className="text-[10px] font-bold text-melagro-primary mb-1 uppercase tracking-widest">Makamithi Express</p>
                  <p className="text-sm font-bold text-gray-900 mb-2">Instant Delivery</p>
                  <p className="text-[11px] text-gray-500 mb-4 italic">To major agricultural zones in Kenya.</p>
                  <Link href="/products" className="inline-block w-full py-2 bg-melagro-primary text-white text-[11px] font-bold rounded-xl hover:bg-melagro-secondary transition-colors text-center">
                    Shop Now
                  </Link>
                </div>
              </div>
            </aside>

            {/* Right Content Area */}
            <div className="flex-1 space-y-12">
              <section>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
                    <p className="text-gray-500 text-sm">Find everything you need for your farm</p>
                  </div>
                  <Link href="/products" className="text-sm font-semibold text-melagro-primary hover:underline">
                    View All →
                  </Link>
                </div>
                <CategoryIcons />
              </section>

              <FlashSaleStrip />

              {/* Main Shop Rows */}
              <div className="space-y-12">
                {/* Best Sellers */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
                      <p className="text-gray-500 text-sm">Trusted by thousands of farmers</p>
                    </div>
                  </div>
                  <ProductRow title="" filter={(p) => p.rating >= 4} />
                </section>

                {/* Promo Banner Mid-Page */}
                <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl group">
                  <img src="https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=1200&auto=format&fit=crop" alt="Seeds Promo" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center p-8 md:p-16">
                    <div className="max-w-md text-white">
                      <span className="inline-block px-3 py-1 bg-melagro-secondary text-white text-xs font-bold rounded-full mb-4">CERTIFIED QUALITY</span>
                      <h3 className="text-3xl md:text-4xl font-bold mb-4">Certified Seeds for High Yield</h3>
                      <p className="mb-8 text-gray-200">Our seeds are laboratory tested and certified for 98% germination rate. Start your season with the best.</p>
                      <Link href="/products?category=seeds" className="bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-melagro-secondary hover:text-white transition-all transform hover:scale-105 shadow-lg">Shop Seeds Collection</Link>
                    </div>
                  </div>
                </div>

                {/* New Arrivals */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">New Arrivals</h2>
                      <p className="text-gray-500 text-sm">Latest additions to our catalog</p>
                    </div>
                  </div>
                  <ProductRow title="" filter={(p) => true} />
                </section>

                {/* Garden Essentials */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Farm Tools & Equipment</h2>
                      <p className="text-gray-500 text-sm">Professional tools for modern farming</p>
                    </div>
                  </div>
                  <ProductRow title="" filter={(p) => p.category === 'Tools' || p.category === 'Equipments'} />
                </section>
              </div>
            </div>
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
