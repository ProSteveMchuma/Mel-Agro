import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import HomeClient from "@/components/HomeClient";
import { getAllProductsServerCached, getFeaturedProductsCached, getUniqueCategoriesCached } from '@/lib/products-server';

// Server Component
export default async function Home() {
  // Parallel data fetching for performance
  const [categories, featuredProducts, allProducts] = await Promise.all([
    getUniqueCategoriesCached(),
    getFeaturedProductsCached(5),
    getAllProductsServerCached(24)
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-green-100 selection:text-green-900">
      <JsonLd />
      <h1 className="sr-only">Certified Agricultural Inputs, Seeds, Fertilizers and Crop Protection Products Delivered Across Kenya</h1>
      <Header />
      <main className="flex-grow w-full">
        <HomeClient
          categories={categories}
          featuredProducts={featuredProducts}
          catalogProducts={allProducts}
        />
      </main>
      <Footer />
    </div>
  );
}
