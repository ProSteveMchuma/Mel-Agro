"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Hero from "@/components/Hero";
import ProductRow from "@/components/ProductRow";
import Newsletter from "@/components/Newsletter";
import CategoryIcons from "@/components/CategoryIcons";
import FlashSaleStrip from "@/components/FlashSaleStrip";
import Partners from "@/components/Partners";
import DualPromoBanners from "@/components/DualPromoBanners";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <JsonLd />
      <Header />

      <main className="flex-grow space-y-8">
        <Hero />

        {/* Mobile Search - Visible only on small screens */}
        <div className="md:hidden container-custom">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search for seeds, tools, fertilizer..."
              className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-800 text-sm border border-gray-200 focus:border-melagro-primary/50 focus:outline-none focus:ring-4 focus:ring-melagro-primary/10 transition-all shadow-sm bg-white"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 group-focus-within:text-melagro-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>

        {/* Categories Section */}
        <section className="container-custom">
          <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Shop by Category</h2>
            <Link href="/products" className="text-sm font-bold text-melagro-primary hover:text-green-700 hover:underline">
              View All &rarr;
            </Link>
          </div>
          <CategoryIcons />
        </section>

        {/* Flash Sale Section */}
        <section className="container-custom">
          <FlashSaleStrip />
        </section>

        {/* Featured Products */}
        <section className="container-custom py-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Featured Products</h2>
              <Link href="/products?sort=featured" className="text-sm font-bold text-melagro-primary hover:text-green-700 hover:underline">
                View All &rarr;
              </Link>
            </div>
            <ProductRow title="" filter={(p) => p.rating >= 4} />
          </div>
        </section>

        {/* Dual Promo Banners */}
        <DualPromoBanners />

        {/* New Arrivals */}
        <section className="container-custom py-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">New Arrivals</h2>
              <Link href="/products?sort=newest" className="text-sm font-bold text-melagro-primary hover:text-green-700 hover:underline">
                View All &rarr;
              </Link>
            </div>
            <ProductRow title="" filter={(p) => true} />
          </div>
        </section>

        {/* Newsletter Section */}
        <div className="bg-white border-t border-gray-100 py-12 mt-8">
          <Newsletter />
        </div>

        {/* Partners Section */}
        <div className="bg-gray-50 py-12 border-t border-gray-200">
          <Partners />
        </div>
      </main>

      <Footer />
    </div>
  );
}
