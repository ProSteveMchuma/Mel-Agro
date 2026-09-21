import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Link from "next/link";
import FeaturedSlider from "@/components/FeaturedSlider";
import HomeRecommendations from "@/components/HomeRecommendations";
import RecentlyViewed from "@/components/RecentlyViewed";
import SidebarCategories, { CATEGORY_ICONS } from "@/components/SidebarCategories";
import Partners from "@/components/Partners";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import { getAllProductsServerCached, getFeaturedProductsCached, getUniqueCategoriesCached } from '@/lib/products-server';
import { slugifySeoValue } from '@/lib/seo';

const QUICK_SHOP = [
  { label: 'Seeds', match: /seed/i, href: '/categories/seeds', hint: 'Maize, veg & pasture' },
  { label: 'Fertilizers', match: /fertiliz/i, href: '/categories/fertilizers', hint: 'Planting & top dress' },
  { label: 'Crop protection', match: /protect|chemical|pesticid|herbicide|insecticide/i, href: '/categories/crop-protection', hint: 'Herbicides & sprays' },
] as const;

// Server Component
export default async function Home() {
  const [categories, featuredProducts, allProducts] = await Promise.all([
    getUniqueCategoriesCached(),
    getFeaturedProductsCached(5),
    getAllProductsServerCached(24)
  ]);

  const quickLinks = QUICK_SHOP.map((item) => {
    const found = categories.find((category) => item.match.test(category));
    return {
      label: item.label,
      hint: item.hint,
      href: found ? `/categories/${slugifySeoValue(found)}` : item.href,
    };
  });

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-green-100 selection:text-green-900">
      <JsonLd />
      <h1 className="sr-only">Certified Agricultural Inputs, Seeds, Fertilizers and Crop Protection Products Delivered Across Kenya</h1>
      <Header />
      <main className="flex-grow w-full">
        {/* Brand-first hero (CMS banners when published) */}
        <Hero />

        {/* One clear job: pick what to shop */}
        <section className="container-custom -mt-2 mb-10" aria-label="Shop farm inputs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="group flex min-h-16 items-center justify-between rounded-2xl border border-gray-100 bg-[#f7faf7] px-5 py-4 transition-colors hover:border-green-300 hover:bg-white"
              >
                <div>
                  <p className="text-sm font-black text-gray-900 tracking-tight">{link.label}</p>
                  <p className="text-[11px] font-medium text-gray-500">{link.hint}</p>
                </div>
                <span className="text-green-700 transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex justify-center sm:justify-end">
            <Link href="/products" className="text-xs font-black uppercase tracking-widest text-green-700 hover:underline">
              Browse all farm inputs →
            </Link>
          </div>
        </section>

        <section className="container-custom mb-8 lg:hidden" aria-labelledby="mobile-categories-heading">
          <div className="mb-4 flex items-end justify-between px-2">
            <h2 id="mobile-categories-heading" className="text-lg font-black tracking-tighter text-gray-900">More categories</h2>
            <Link href="/products" className="text-xs font-bold text-green-700">All <span aria-hidden="true">→</span></Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <Link key={category} href={`/categories/${slugifySeoValue(category)}`} className="flex min-h-12 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 transition-colors hover:border-green-200">
                <span className="text-lg" aria-hidden="true">{CATEGORY_ICONS[category] || "🌾"}</span>
                <span className="truncate text-xs font-bold text-gray-700">{category}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="container-custom">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="hidden w-1/4 flex-shrink-0 lg:block"><SidebarCategories categories={categories} /></div>
            <div className="w-full flex-grow space-y-16 lg:w-3/4">
              <FeaturedSlider products={featuredProducts} />
              <RecentlyViewed />
              <HomeRecommendations products={allProducts} />
            </div>
          </div>
        </section>

        <Partners />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
