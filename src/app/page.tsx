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
const DualPromoBanners = dynamic(() => import("@/components/DualPromoBanners"), { ssr: false });
const FlashSaleStrip = dynamic(() => import("@/components/FlashSaleStrip"), { ssr: false });

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

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-green-100 selection:text-green-900">
      <JsonLd />
      <Header />

      <main className="flex-grow space-y-12 md:space-y-20 pb-20">
        <Hero />

        {/* Mobile Search - Visible only on small screens */}
        <div className="md:hidden container-custom">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            <form onSubmit={(e) => {
              e.preventDefault();
              const query = (e.currentTarget.querySelector('input') as HTMLInputElement).value;
              if (query.trim()) {
                window.location.href = `/products?search=${encodeURIComponent(query.trim())}`;
              }
            }}>
              <input
                type="text"
                placeholder="Search seeds, tools, fertilizers..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-800 text-sm border border-gray-100 focus:border-green-500/50 focus:outline-none focus:ring-4 focus:ring-green-500/10 transition-all shadow-sm bg-gray-50"
              />
              <button type="submit" className="absolute left-4 top-4.5 group-focus-within:text-green-500 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </button>
            </form>
          </motion.div>
        </div>

        {/* Categories Section */}
        <section className="container-custom">
          <FadeInWhenVisible>
            <div className="flex justify-between items-end mb-8 px-2">
              <div>
                <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em] mb-2">Explore</p>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">Shop by Category</h2>
              </div>
              <Link href="/products" className="group flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-green-600 transition-colors">
                View All <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
            <CategoryIcons />
          </FadeInWhenVisible>
        </section>

        {/* Flash Sale Section */}
        <section className="container-custom">
          <FadeInWhenVisible delay={0.1}>
            <FlashSaleStrip />
          </FadeInWhenVisible>
        </section>

        {/* Featured Products */}
        <section className="container-custom">
          <FadeInWhenVisible>
            <div className="bg-gray-50/50 p-8 md:p-12 rounded-[3rem] border border-gray-100">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em] mb-2">Picked for you</p>
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase">Featured Products</h2>
                </div>
                <Link href="/products?sort=featured" className="group flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-green-600 transition-colors">
                  View All <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
              <ProductRow title="" filter={(p) => p.rating >= 4} />
            </div>
          </FadeInWhenVisible>
        </section>

        {/* Dual Promo Banners */}
        <FadeInWhenVisible>
          <DualPromoBanners />
        </FadeInWhenVisible>

        {/* New Arrivals */}
        <section className="container-custom">
          <FadeInWhenVisible>
            <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />

              <div className="flex justify-between items-center mb-10 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em] mb-2">Just Landed</p>
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">NEW ARRIVALS</h2>
                </div>
                <Link href="/products?sort=newest" className="group flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-green-600 transition-colors">
                  View All <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
              <ProductRow title="" filter={(p) => true} />
            </div>
          </FadeInWhenVisible>
        </section>

        <FadeInWhenVisible>
          <Partners />
        </FadeInWhenVisible>

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
