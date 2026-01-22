import { Metadata } from "next";
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
    title: "Agricultural Marketplace | Seeds, Fertilizers & Tools",
    description: "Browse our comprehensive catalogue of agricultural inputs. From hybrid maize seeds to high-nitrogen fertilizers, we have everything you need for a successful harvest.",
    keywords: ["seeds", "fertilizers", "farm tools", "pesticides", "animal feeds", "kenya agrivet"],
};

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div>
        </div>}>
            <ProductsClient />
        </Suspense>
    );
}
