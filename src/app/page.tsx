import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import WhatsAppButton from "@/components/WhatsAppButton";
import HomeClient from "@/components/HomeClient";
import { getUniqueCategories, getFeaturedProducts, getProducts } from "@/lib/products";

// Server Component
export default async function Home() {
  // Parallel data fetching for performance
  const [categories, featuredProducts, allProducts] = await Promise.all([
    getUniqueCategories(),
    getFeaturedProducts(5),
    getProducts()
  ]);

  // Filter recommended products server-side
  const recommendedProducts = allProducts.filter(p => p.rating >= 4);

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-green-100 selection:text-green-900">
      <JsonLd />
      <Header />
      <main className="flex-grow w-full">
        <HomeClient
          categories={categories}
          featuredProducts={featuredProducts}
          recommendedProducts={recommendedProducts}
        />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
