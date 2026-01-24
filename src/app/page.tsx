"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Hero from "@/components/Hero";
import ProductRow from "@/components/ProductRow";
import CategoryIcons from "@/components/CategoryIcons";
import Link from "next/link";
import { motion } from "framer-motion";
import WhatsAppButton from "@/components/WhatsAppButton";
import dynamic from 'next/dynamic';

const Newsletter = dynamic(() => import("@/components/Newsletter"), { ssr: false });
const Partners = dynamic(() => import("@/components/Partners"), { ssr: false });
const FeaturedSlider = dynamic(() => import("@/components/FeaturedSlider"), { ssr: false });

const FadeInWhenVisible = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
};

import { getUniqueCategories } from "@/lib/products";
import { useState, useEffect } from "react";
import SidebarCategories, { CATEGORY_ICONS } from "@/components/SidebarCategories";

export default function Home() {
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDynamicData = async () => {
      const cats = await getUniqueCategories();
      setCategories(cats);
    };
    fetchDynamicData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-green-100 selection:text-green-900">
      <JsonLd />
      <Header />

      <main className="flex-grow space-y-12 md:space-y-16 pb-20 pt-8">

        {/* Top Section: Sidebar + Main Content (Hero & Featured) */}
        <section className="container-custom">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar Categories (Left) */}
            <div className="hidden lg:block w-1/4 flex-shrink-0">
              <FadeInWhenVisible>
                <SidebarCategories categories={categories} />
              </FadeInWhenVisible>
            </div>

            {/* Main Content Area (Right) */}
            <div className="flex-grow w-full lg:w-3/4 space-y-12">

              {/* Featured Products Slider (Top) */}
              <FadeInWhenVisible>
                <FeaturedSlider />
              </FadeInWhenVisible>

              {/* Integrated Search Bar */}
              <FadeInWhenVisible delay={0.1}>
                <div className="bg-gray-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight uppercase">Find your farm inputs</h2>
                    <form onSubmit={handleSearch} className="relative group">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search seeds, fertilizers, veterinary products..."
                        className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white text-gray-900 text-lg border-none focus:ring-4 focus:ring-green-500/50 transition-all shadow-lg placeholder:text-gray-400"
                      />
                      <button type="submit" className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                      </button>
                    </form>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {['Hybrid Maize', 'DAP Fertilizer', 'Knapsack Sprayer'].map(tag => (
                        <button
                          key={tag}
                          onClick={() => { setSearchQuery(tag); }}
                          className="text-[10px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeInWhenVisible>

              {/* Featured Products Grid */}
              <FadeInWhenVisible delay={0.2}>
                <div className="bg-gray-50/50 p-8 md:p-12 rounded-[3rem] border border-gray-100">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em] mb-2">Popular Picks</p>
                      <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase">Recommended for you</h2>
                    </div>
                  </div>
                  <ProductRow title="" filter={(p) => p.rating >= 4} />
                </div>
              </FadeInWhenVisible>

            </div>
          </div>
        </section>

        {/* Mobile-only Category Scroll (since sidebar is hidden on small screens) */}
        <section className="lg:hidden container-custom">
          <FadeInWhenVisible>
            <div className="flex justify-between items-end mb-6 px-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Shop by Category</h2>
              <Link href="/products" className="text-sm font-bold text-green-600">All →</Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {categories.map((cat: string) => (
                <Link
                  key={cat}
                  href={`/products?category=${encodeURIComponent(cat)}`}
                  className="flex-shrink-0 px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="text-xl">
                    {CATEGORY_ICONS[cat] || "🌾"}
                  </span>
                  <span className="text-sm font-bold text-gray-700">{cat}</span>
                </Link>
              ))}
            </div>
          </FadeInWhenVisible>
        </section>

        <FadeInWhenVisible>
          <Partners />
        </FadeInWhenVisible>

        {/* Hero Slider (Moved to Bottom) */}
        <section className="container-custom">
          <FadeInWhenVisible>
            <div className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 p-2">
              <Hero />
            </div>
          </FadeInWhenVisible>
        </section>

        {/* Newsletter Section */}
        <FadeInWhenVisible>
          <Newsletter />
        </FadeInWhenVisible>

      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
