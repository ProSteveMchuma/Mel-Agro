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
    
    let title = "Buy Agricultural Inputs, Seeds & Fertilizers Online Kenya | Mel-Agri";
    let description = "Order certified high-quality agricultural inputs online at Mel-Agri Kenya. Shop hybrid seeds, fertilizers, crop protection chemicals, and farm tools with fast farm delivery.";
    let keywords = ["buy agricultural inputs", "agrovet online Kenya", "certified seeds supplier", "fertilizer price Kenya", "farm tools online", "Mel-Agri"];
    
    if (category) {
        title = `Buy Premium ${category} Online Kenya - Fast Farm Delivery | Mel-Agri`;
        description = `Buy certified ${category} online at Mel-Agri. Select from premium brands with fast shipping to Nakuru, Eldoret, Nairobi, Kisumu, and all 47 counties in Kenya.`;
        keywords = [category, `buy ${category} online`, `${category} price Kenya`, `certified ${category} supplier`, "agrovet Kenya", "farm inputs"];
    } else if (brand) {
        title = `Buy Original ${brand} Products Online Kenya - Best Prices | Mel-Agri`;
        description = `Shop certified crop protection and seed products from ${brand} online at Mel-Agri. Authorized dealer with fast farm delivery to Nakuru, Eldoret, Kisumu, and countrywide in Kenya.`;
        keywords = [brand, `original ${brand} products`, `${brand} distributor Kenya`, `buy ${brand} online`, "authorized agrovet"];
    } else if (search) {
        title = `Search Results for "${search}" | Mel-Agri Online Marketplace`;
        description = `Find premium certified agricultural inputs matching "${search}" at Mel-Agri Kenya. Shop seeds, fertilizers, and farm equipment online with secure payment and fast delivery.`;
        keywords = [search, `buy ${search} Kenya`, `${search} price`, "online agrovet"];
    }

    return {
        title,
        description,
        keywords: keywords.map(k => k.toLowerCase()),
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
