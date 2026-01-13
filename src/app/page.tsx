"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import BannerCarousel from "@/components/BannerCarousel";
import CategoryIcons from "@/components/CategoryIcons";
import FlashSaleStrip from "@/components/FlashSaleStrip";
import Partners from "@/components/Partners";
import ProductRow from "@/components/ProductRow";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

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

        {/* Main Content with Sidebar */}
        <div className="flex bg-white">
          {/* Left Sidebar - Hidden on mobile */}
          <div className="hidden lg:block w-64 border-r border-gray-200 pt-8 sticky top-20 h-fit">
            <div className="px-6 space-y-6">
              {/* Browse Categories */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Browse Categories</h3>
                <nav className="space-y-2">
                  {[
                    "Seeds & Seedlings",
                    "Fertilizers",
                    "Crop Protection",
                    "Farm Tools",
                    "Irrigation",
                    "Animal Feeds",
                    "Vet Products",
                    "Bulk Orders"
                  ].map((cat, idx) => (
                    <Link
                      key={idx}
                      href={`/products?category=${encodeURIComponent(cat)}`}
                      className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-melagro-primary hover:bg-gray-50 transition-all"
                    >
                      {cat}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Promo Box */}
              <div className="pt-6 border-t border-gray-200 bg-gradient-to-br from-melagro-primary/10 to-melagro-secondary/10 p-4 rounded-lg border border-melagro-primary/20">
                <p className="text-xs font-semibold text-melagro-primary mb-2">MAKAMITHI EXPRESS</p>
                <p className="text-sm font-bold text-gray-900 mb-3">Fast Delivery</p>
                <p className="text-xs text-gray-600 mb-3">To major towns</p>
                <Link href="/checkout" className="inline-block px-3 py-1.5 bg-melagro-primary text-white text-xs font-bold rounded-lg hover:bg-melagro-secondary transition-colors">
                  Shop Now
                </Link>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 py-12">
            <div className="container-custom px-4 md:px-8 space-y-16">
              
              {/* Featured Banner with Offer */}
              <section className="relative h-72 md:h-96 rounded-2xl overflow-hidden shadow-lg group">
                <img 
                  src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=1400&auto=format&fit=crop" 
                  alt="Prepare For Long Rains" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent flex flex-col justify-center px-6 md:px-16">
                  <div className="mb-4">
                    <span className="inline-block bg-melagro-accent text-melagro-primary font-bold text-xs px-3 py-1.5 rounded-lg uppercase tracking-wider">
                      Weekly Offer
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight">
                    Prepare Your Shamba<br />For The Long Rains
                  </h2>
                  <p className="text-gray-100 text-base md:text-lg mb-6 max-w-lg">
                    Get up to 20% OFF on all planting fertilizers and certified hybrid maize seeds.
                  </p>
                  <div className="flex gap-4">
                    <Link href="/products" className="bg-melagro-accent hover:bg-melagro-accent/90 text-melagro-primary px-6 py-3 rounded-lg font-bold transition-all inline-flex items-center gap-2">
                      Shop Now →
                    </Link>
                  </div>
                </div>
                
                {/* Carousel Indicators */}
                <div className="absolute bottom-4 left-6 flex gap-2">
                  <button className="w-2 h-2 bg-white/60 rounded-full"></button>
                  <button className="w-2 h-2 bg-white/30 rounded-full"></button>
                  <button className="w-2 h-2 bg-white/30 rounded-full"></button>
                </div>
              </section>

              {/* Categories Section */}
              <section>
                <div className="mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Shop by Category</h2>
                  <p className="text-gray-500">Everything you need for a successful harvest</p>
                </div>
                <CategoryIcons />
              </section>

              {/* Flash Sale */}
              <FlashSaleStrip />

              {/* Best Sellers */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Best Sellers</h2>
                    <p className="text-gray-500">Trusted by thousands of farmers</p>
                  </div>
                  <Link href="/products" className="text-sm font-semibold text-melagro-primary hover:text-melagro-secondary transition-colors flex items-center gap-1 group">
                    See All 
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <ProductRow title="" filter={(p) => p.price > 2000} />
              </section>

              {/* Promotional Banner - Seeds */}
              <section className="relative h-64 md:h-72 rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-melagro-primary to-melagro-secondary flex items-center">
                <div className="px-6 md:px-12 py-8 z-10">
                  <p className="text-melagro-accent font-semibold text-xs md:text-sm uppercase tracking-wider mb-2">Premium Collection</p>
                  <h3 className="text-2xl md:text-4xl font-bold text-white mb-3">Certified Genuine</h3>
                  <p className="text-gray-100 text-sm md:text-base mb-6 max-w-lg">Direct from manufacturers. Quality assured agricultural inputs.</p>
                  <Link href="/products?category=Seeds" className="inline-block bg-white text-melagro-primary px-6 py-2.5 rounded-lg font-bold hover:bg-gray-100 transition-colors">
                    Shop Certified Inputs →
                  </Link>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10">
                  <img 
                    src="https://images.unsplash.com/photo-1625246333333-37e7b646a6da?q=80&w=600" 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </section>

              {/* New Arrivals */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">New Arrivals</h2>
                    <p className="text-gray-500">Latest additions to our catalog</p>
                  </div>
                  <Link href="/products" className="text-sm font-semibold text-melagro-primary hover:text-melagro-secondary transition-colors flex items-center gap-1 group">
                    See All 
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <ProductRow title="" filter={(p) => true} />
              </section>

              {/* Garden Essentials / Tools */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Farm Tools & Equipment</h2>
                    <p className="text-gray-500">Professional tools for modern farming</p>
                  </div>
                  <Link href="/products?category=Farm%20Tools" className="text-sm font-semibold text-melagro-primary hover:text-melagro-secondary transition-colors flex items-center gap-1 group">
                    See All 
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <ProductRow title="" filter={(p) => p.category === 'Tools'} />
              </section>
            </div>
          </div>
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
