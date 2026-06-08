import { Metadata } from "next";
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";
import { getProductsPage } from "@/lib/products";
import { getUniqueBrandsCached, getUniqueCategoriesCached } from "@/lib/products-server";

type Props = {
    searchParams: Promise<{ category?: string; brand?: string; search?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const { category, brand, search } = await searchParams;
    
    let title = "Agricultural Marketplace | Seeds, Fertilizers & Tools | Mel-Agro";
    let description = "Bringing Quality Agricultural Inputs Online in Kenya. Browse our comprehensive catalogue of agricultural inputs, from hybrid maize seeds to high-nitrogen fertilizers.";
    
    if (category) {
        title = `Buy Premium ${category} Online Kenya - Best Prices | Mel-Agro`;
        description = `Shop certified high-quality ${category} online at Mel-Agro Kenya. We supply premium brand inputs with fast delivery directly to your farm.`;
    } else if (brand) {
        title = `Original ${brand} Products Online Kenya - Authorized Dealer | Mel-Agro`;
        description = `Browse original crop care and seed products from ${brand} online at Mel-Agro. Certified agricultural inputs with fast nationwide shipping in Kenya.`;
    } else if (search) {
        title = `Search Results for "${search}" | Mel-Agro`;
        description = `Find top-rated agricultural inputs matching "${search}" at Mel-Agro Kenya. Shop seeds, chemical sprays, fertilizers, and farm equipment online.`;
    }

    return {
        title,
        description,
        keywords: [category || "", brand || "", search || "", "seeds", "fertilizers", "farm tools", "pesticides", "animal feeds", "kenya agrovet"].filter(Boolean),
    };
}

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
