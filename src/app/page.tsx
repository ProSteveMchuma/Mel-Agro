"use client";

import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ShopLayout from "@/components/ShopLayout";
import JsonLd from "@/components/JsonLd";
import BannerCarousel from "@/components/BannerCarousel";
import CategoryIcons from "@/components/CategoryIcons";
import FlashSaleStrip from "@/components/FlashSaleStrip";
import Partners from "@/components/Partners";

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

          {/* Main Shop Grid */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold text-gray-900">Just For You</h2>
              <div className="h-px bg-gray-200 flex-grow"></div>
            </div>
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melagro-primary"></div></div>}>
              <ShopLayout showBreadcrumbs={false} />
            </Suspense>
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
