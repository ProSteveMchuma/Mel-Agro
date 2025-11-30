"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Partners from "@/components/Partners";
import FAQ from "@/components/FAQ";
import Link from "next/link";
import Image from "next/image";
import { getProducts, Product } from "@/lib/products";
import { useEffect, useState } from "react";

const CATEGORIES = [
  { name: 'Fertilizers', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=1000&auto=format&fit=crop', link: '/products?category=fertilizers' },
  { name: 'Seeds', image: 'https://images.unsplash.com/photo-1595839088654-2e91277c0505?q=80&w=1000&auto=format&fit=crop', link: '/products?category=seeds' },
  { name: 'Crop Protection', image: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=1000&auto=format&fit=crop', link: '/products?category=protection' },
  { name: 'Animal Feeds', image: 'https://images.unsplash.com/photo-1548590346-602952ded18c?q=80&w=1000&auto=format&fit=crop', link: '/products?category=feeds' },
];

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const products = await getProducts();
        // Simple "featured" logic: take first 4. In production, you might have a 'featured' flag in DB.
        setFeaturedProducts(products.slice(0, 4));
      } catch (error) {
        console.error("Failed to fetch featured products", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <Header />

      <main className="flex-grow">
        <Hero />

        <Partners />

        {/* Shop by Category */}
        <section className="py-24 bg-gray-50">
          {/* ... (keep existing category section) ... */}
          <div className="container-custom">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
              <div>
                <span className="text-melagro-primary font-bold tracking-wider uppercase text-sm">Browse Collections</span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Shop by Category</h2>
              </div>
              <Link href="/products" className="text-melagro-primary font-medium hover:text-melagro-secondary transition-colors flex items-center gap-2 group">
                View All Categories
                <span className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {CATEGORIES.map((cat) => (
                <Link key={cat.name} href={cat.link} className="group relative h-96 rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute bottom-0 left-0 p-8 w-full">
                    <h3 className="text-2xl font-bold text-white mb-2">{cat.name}</h3>
                    <div className="h-1 w-12 bg-melagro-secondary rounded-full mb-4 group-hover:w-20 transition-all duration-300" />
                    <span className="text-white/90 text-sm font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                      Explore Collection <span className="text-melagro-secondary">&rarr;</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-24">
          <div className="container-custom">
            <div className="text-center mb-16">
              <span className="text-melagro-primary font-bold tracking-wider uppercase text-sm">Top Picks</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">Trending Products</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Handpicked selection of our best-selling agricultural inputs, trusted by farmers across the region.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    image={product.image}
                    category={product.category}
                  />
                ))}
              </div>
            )}

            <div className="text-center mt-16">
              <Link href="/products" className="btn-primary inline-flex items-center gap-2">
                Shop All Products
              </Link>
            </div>
          </div>
        </section>

        {/* Promotional Banner */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-melagro-primary">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-melagro-secondary rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-melagro-accent rounded-full opacity-20 blur-3xl"></div>
          </div>
          <div className="container-custom relative z-10 text-center text-white">
            <span className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6">
              Limited Time Offer
            </span>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">Seasonal Planting Sale</h2>
            <p className="text-xl text-gray-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              Get up to <span className="text-melagro-accent font-bold">20% OFF</span> on selected fertilizers and certified seeds. Start your season right with MelAgro.
            </p>
            <Link href="/products" className="bg-white text-melagro-primary font-bold py-4 px-10 rounded-full hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 inline-block">
              View Offers
            </Link>
          </div>
        </section>

        <FAQ />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
