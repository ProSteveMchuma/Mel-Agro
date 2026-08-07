"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProductRow from "@/components/ProductRow";
import type { Product } from "@/lib/products";
import { useBehavior } from "@/context/BehaviorContext";
import { rankProductsForUser, RECOMMENDATION_MODEL_VERSION } from "@/lib/personalization";
import { AnalyticsService } from "@/lib/analytics";
import { useAuth } from "@/context/AuthContext";
import { assignExperiment, type ExperimentVariant, PERSONALIZED_HOME_EXPERIMENT } from "@/lib/experimentation";

export default function HomeRecommendations({ products }: { products: Product[] }) {
  const { affinityIndex, personalizationEnabled, setPersonalizationEnabled } = useBehavior();
  const { user } = useAuth();
  const [regionalPopularity, setRegionalPopularity] = useState<Record<string, number>>({});
  const [experimentVariant, setExperimentVariant] = useState<ExperimentVariant>("control");

  useEffect(() => {
    const storageKey = "melagri_experiment_subject";
    let subject = user?.uid || window.localStorage.getItem(storageKey);
    if (!subject) {
      subject = window.crypto.randomUUID();
      window.localStorage.setItem(storageKey, subject);
    }
    setExperimentVariant(assignExperiment(PERSONALIZED_HOME_EXPERIMENT, subject));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.county || !personalizationEnabled) {
      setRegionalPopularity({});
      return;
    }
    const controller = new AbortController();
    fetch(`/api/recommendations?county=${encodeURIComponent(user.county)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setRegionalPopularity(data?.scores || {}))
      .catch(() => undefined);
    return () => controller.abort();
  }, [personalizationEnabled, user?.county]);

  const enabled = personalizationEnabled && experimentVariant === "treatment";
  const source = `${RECOMMENDATION_MODEL_VERSION}:${experimentVariant}`;
  const ranked = useMemo(
    () => rankProductsForUser(products, affinityIndex, enabled, 12, regionalPopularity, user?.county),
    [products, affinityIndex, enabled, regionalPopularity, user?.county],
  );
  const recommendedProducts = useMemo(() => ranked.map((item) => item.product), [ranked]);
  const reasons = useMemo(
    () => Object.fromEntries(ranked.map((item) => [String(item.product.id), item.reason])),
    [ranked],
  );
  const personalized = enabled && Object.keys(affinityIndex).length > 0;

  useEffect(() => {
    if (recommendedProducts.length) {
      void AnalyticsService.logRecommendationImpression(recommendedProducts.map((product) => String(product.id)), source);
    }
  }, [recommendedProducts, source]);

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-600">
            {personalized ? "Selected for your farm" : "Commercial selection"}
          </p>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 md:text-4xl">
            {personalized ? "Picked for you" : "Top products"}
          </h2>
          <p className="hidden max-w-md text-sm font-medium text-gray-500 sm:block">
            {personalized
              ? "Ranked from the categories you explore. Every suggestion includes its reason."
              : "Available products ranked by quality and customer trust."}
          </p>
          <label className="mt-3 hidden items-center gap-2 text-xs font-bold text-gray-600 md:inline-flex">
            <input
              type="checkbox"
              checked={personalizationEnabled}
              onChange={(event) => void setPersonalizationEnabled(event.target.checked)}
              className="h-4 w-4 accent-green-600"
            />
            Personalize my product suggestions
          </label>
        </div>
        <Link href="/products" className="shrink-0 text-xs font-black text-green-700 hover:text-green-600 md:rounded-2xl md:bg-gray-900 md:px-8 md:py-4 md:text-[10px] md:uppercase md:tracking-widest md:text-white">
          View all <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-4 shadow-sm md:rounded-[3.5rem] md:p-12">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-green-500/5 blur-3xl" aria-hidden="true" />
        <ProductRow products={recommendedProducts} title="" recommendationSource={source} recommendationReasons={reasons} />
      </div>
    </div>
  );
}
