import { Metadata } from "next";
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";
import { getProductsPage } from "@/lib/products";
import { getUniqueBrandsCached, getUniqueCategoriesCached } from "@/lib/products-server";

export const metadata: Metadata = {
    title: "Agricultural Marketplace | Seeds, Fertilizers & Tools",
    description: "Bringing Quality Agricultural Inputs Online in Kenya. Browse our comprehensive catalogue of agricultural inputs, from hybrid maize seeds to high-nitrogen fertilizers.",
    keywords: ["seeds", "fertilizers", "farm tools", "pesticides", "animal feeds", "kenya agrivet"],
};

export default async function ProductsPage() {
    // Fetch initial data on the server
    const [{ products: initialProducts }, brands, categories] = await Promise.all([
        getProductsPage(12), // Initial page size 12
        getUniqueBrandsCached(),
        getUniqueCategoriesCached()
    ]);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Agricultural Products Market | Mel-Agri',
        description: 'Bringing Quality Agricultural Inputs Online in Kenya. Browse our comprehensive catalogue of agricultural inputs.',
        url: 'https://melagri.co.ke/products',
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: 'https://melagri.co.ke',
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Products',
                    item: 'https://melagri.co.ke/products',
                },
            ],
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagri-primary"></div>
            </div>}>
                <ProductsClient
                    initialProducts={initialProducts}
                    initialBrands={brands}
                    initialCategories={categories}
                />
            </Suspense>
        </>
    );
}
