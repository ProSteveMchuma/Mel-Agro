"use client";

import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ShopLayout from "@/components/ShopLayout";
import JsonLd from "@/components/JsonLd";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <JsonLd />
      <Header />

      <main className="flex-grow">
        {/* Compact "Daily Deals" Hero */}
        <div className="bg-gradient-to-r from-melagro-primary to-melagro-secondary text-white py-6 shadow-md">
          <div className="container-custom flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="bg-white text-melagro-primary px-2 py-0.5 rounded text-sm font-extrabold uppercase tracking-wider">Today's Deals</span>
                Flash Sales
              </h1>
              <p className="text-sm text-white/90 mt-1">Get up to 20% off on Fertilizer & Seeds. Ends tonight!</p>
            </div>
            <div className="hidden md:block">
              <span className="text-sm font-medium bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/30">
                ⏱️ Offer ends in: 08h 12m
              </span>
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div></div>}>
          <ShopLayout showBreadcrumbs={false} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
