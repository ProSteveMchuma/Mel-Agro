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
import EnhancedSearch from "@/components/EnhancedSearch";

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
            <div className="flex-grow w-full lg:w-3/4 space-y-16">

              {/* Enhanced Search Block */}
              <FadeInWhenVisible>
                <div className="relative py-12 px-8 rounded-[3rem] overflow-hidden bg-gray-50 border border-gray-100">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1932&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
                  <div className="relative z-10 text-center space-y-8">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.4em]">Premium Agricultural Marketplace</p>
                      <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-[0.9]">Find your farm inputs</h1>
                    </div>
                    <EnhancedSearch />
                  </div>
                </div>
              </FadeInWhenVisible>

              {/* Featured Products Slider */}
              <FadeInWhenVisible delay={0.1}>
                <FeaturedSlider />
              </FadeInWhenVisible>

              {/* Recommended Products - Elevated & Refined */}
              <FadeInWhenVisible delay={0.2}>
                <div className="space-y-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">Commercial Selection</p>
                      <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase">Recommended for you</h2>
                      <p className="text-sm text-gray-500 font-medium max-w-md">Top-rated products trusted by successful farmers across the country.</p>
                    </div>
                    <Link href="/products" className="bg-gray-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl shadow-gray-900/10">
                      View Catalog →
                    </Link>
                  </div>
                  <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />
                    <ProductRow title="" filter={(p) => p.rating >= 4} />
                  </div>
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
