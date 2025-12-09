"use client";

import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ShopLayout from "@/components/ShopLayout";

export default function ProductsPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            {/* Page Header */}
            <div className="bg-melagro-primary text-white py-12">
                <div className="container-custom text-center">
                    <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">Our Products</h1>
                    <p className="text-base text-gray-200 max-w-2xl mx-auto">
                        Premium agricultural inputs for your farm.
                    </p>
                </div>
            </div>

            <main className="flex-grow">
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div></div>}>
                    <ShopLayout />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}

