"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import SidebarCategories, { CATEGORY_ICONS } from "@/components/SidebarCategories";
import FeaturedSlider from "@/components/FeaturedSlider";
import ProductRow from "@/components/ProductRow";
import Partners from "@/components/Partners";
import Hero from "@/components/Hero";
import { Product } from "@/lib/products";
import { useBehavior } from "@/context/BehaviorContext";
import { rankProductsForUser, RECOMMENDATION_MODEL_VERSION } from "@/lib/personalization";
import { AnalyticsService } from "@/lib/analytics";
import { useAuth } from '@/context/AuthContext';
import { assignExperiment, ExperimentVariant, PERSONALIZED_HOME_EXPERIMENT } from '@/lib/experimentation';
import { slugifySeoValue } from '@/lib/seo';

const FadeInWhenVisible = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
            {children}
        </motion.div>
    );
};

interface HomeClientProps {
    categories: string[];
    featuredProducts: Product[];
    catalogProducts: Product[];
}

export default function HomeClient({ categories, featuredProducts, catalogProducts }: HomeClientProps) {
    const { affinityIndex, personalizationEnabled, setPersonalizationEnabled } = useBehavior();
    const { user } = useAuth();
    const [regionalPopularity, setRegionalPopularity] = useState<Record<string, number>>({});
    const [experimentVariant, setExperimentVariant] = useState<ExperimentVariant>('control');
    useEffect(() => {
        const storageKey = 'melagri_experiment_subject';
        let subject = user?.uid || window.localStorage.getItem(storageKey);
        if (!subject) {
            subject = window.crypto.randomUUID();
            window.localStorage.setItem(storageKey, subject);
        }
        setExperimentVariant(assignExperiment(PERSONALIZED_HOME_EXPERIMENT, subject));
    }, [user?.uid]);
    useEffect(() => {
        if (!user?.county || !personalizationEnabled) { setRegionalPopularity({}); return; }
        const controller = new AbortController();
        fetch(`/api/recommendations?county=${encodeURIComponent(user.county)}`, { signal: controller.signal })
            .then(response => response.ok ? response.json() : null)
            .then(data => setRegionalPopularity(data?.scores || {}))
            .catch(() => {});
        return () => controller.abort();
    }, [personalizationEnabled, user?.county]);
    const experimentPersonalizationEnabled = personalizationEnabled && experimentVariant === 'treatment';
    const recommendationSource = `${RECOMMENDATION_MODEL_VERSION}:${experimentVariant}`;
    const ranked = useMemo(
        () => rankProductsForUser(catalogProducts, affinityIndex, experimentPersonalizationEnabled, 12, regionalPopularity, user?.county),
        [catalogProducts, affinityIndex, experimentPersonalizationEnabled, regionalPopularity, user?.county],
    );
    const recommendedProducts = useMemo(() => ranked.map(item => item.product), [ranked]);
    const recommendationReasons = useMemo(() => Object.fromEntries(ranked.map(item => [String(item.product.id), item.reason])), [ranked]);
    const personalized = experimentPersonalizationEnabled && Object.keys(affinityIndex).length > 0;

    useEffect(() => {
        if (recommendedProducts.length) {
            void AnalyticsService.logRecommendationImpression(recommendedProducts.map(product => String(product.id)), recommendationSource);
        }
    }, [recommendedProducts, recommendationSource]);
    return (
        <>
            {/* Mobile-only Category Scroll (since sidebar is hidden on small screens) */}
            <section className="lg:hidden container-custom mb-8">
                <FadeInWhenVisible>
                    <div className="flex justify-between items-end mb-4 px-2">
                        <h2 className="text-lg font-black text-gray-900 tracking-tighter">Shop by Category</h2>
                        <Link href="/products" className="text-xs font-bold text-green-600">All →</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {categories.map((cat: string) => (
                            <Link
                                key={cat}
                                href={`/categories/${slugifySeoValue(cat)}`}
                                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-green-200 transition-colors"
                            >
                                <span className="text-lg">
                                    {CATEGORY_ICONS[cat] || "🌾"}
                                </span>
                                <span className="text-xs font-bold text-gray-700 truncate">{cat}</span>
                            </Link>
                        ))}
                    </div>
                </FadeInWhenVisible>
            </section>

            {/* Top Section: Sidebar + Main Content (Hero & Featured) */}
            <section className="container-custom">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Sidebar Categories (Left) */}
                    <div className="hidden lg:block w-1/4 flex-shrink-0">
                        <FadeInWhenVisible>
                            <SidebarCategories categories={categories} />
                        </FadeInWhenVisible>
                    </div>

                    {/* Main Content Area (Right) */}
                    <div className="flex-grow w-full lg:w-3/4 space-y-16">


                        {/* Featured Products Slider */}
                        <FadeInWhenVisible delay={0.1}>
                            <FeaturedSlider products={featuredProducts} />
                        </FadeInWhenVisible>

                        {/* Recommended Products - Elevated & Refined */}
                        <FadeInWhenVisible delay={0.2}>
                            <div className="space-y-10">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    {/* Header Text - Hidden on Mobile */}
                                    <div className="hidden md:block space-y-1">
                                        <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">{personalized ? 'Selected for your farm' : 'Commercial selection'}</p>
                                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase">{personalized ? 'Picked for you' : 'Top products'}</h2>
                                        <p className="text-sm text-gray-500 font-medium max-w-md">{personalized ? 'Ranked from the categories you explore. Every suggestion includes its reason.' : 'Available products ranked by quality and customer trust.'}</p>
                                        <label className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-gray-600">
                                            <input type="checkbox" checked={personalizationEnabled} onChange={event => void setPersonalizationEnabled(event.target.checked)} className="h-4 w-4 accent-green-600" />
                                            Personalize my product suggestions
                                        </label>
                                    </div>

                                    {/* Button - Hidden on Mobile to prioritize product grid immediately */}
                                    <Link href="/products" className="hidden md:block bg-gray-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl shadow-gray-900/10">
                                        View Catalog →
                                    </Link>
                                </div>

                                <div className="bg-white p-4 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />
                                    <ProductRow products={recommendedProducts} title="" recommendationSource={recommendationSource} recommendationReasons={recommendationReasons} />
                                </div>
                            </div>
                        </FadeInWhenVisible>

                    </div>
                </div>
            </section>



            <FadeInWhenVisible>
                <Partners />
            </FadeInWhenVisible>

            {/* Hero Slider (Moved to Bottom) */}
            <section className="container-custom">
                <FadeInWhenVisible>
                    <div className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 p-2">
                        <Hero />
                    </div>
                </FadeInWhenVisible>
            </section>

        </>
    );
}
