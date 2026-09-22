"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { HomepageBanner } from "@/lib/cms-homepage-server";

/** Hero that renders explicit banners (draft/live preview) instead of ContentContext live snapshot. */
export default function HeroPreview({ banners }: { banners: HomepageBanner[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const activeBanners = banners.filter((b) => b.active);

  const slides =
    activeBanners.length > 0
      ? activeBanners.map((b) => ({
          id: b.id,
          image: b.image,
          tag: "Weekly Offer",
          title: b.title,
          description: b.description || b.subtitle || "Discover our premium agricultural products.",
          primaryBtn: "Shop Now",
          primaryLink: b.link || "/products",
        }))
      : [
          {
            id: "shamba-ready",
            image: "/images/kenyan-farmer-banner.png",
            tag: "WEEKLY OFFER",
            title: "Prepare Your Shamba For The Long Rains",
            description: "Get certified hybrid maize seeds and planting fertilizers today.",
            primaryBtn: "Shop Now",
            primaryLink: "/categories/seeds",
          },
        ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="bg-white py-3 sm:py-4 md:py-6">
      <div className="container-custom">
        <p className="mb-3 px-0.5 text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-green-700 md:px-2">
          Mel-Agri · Online retail arm of Makamithi
        </p>
        <div className="relative rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] overflow-hidden group shadow-2xl h-[min(70vw,360px)] sm:h-[400px] md:h-[500px] min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <div className="absolute inset-0">
                <Image
                  src={slides[currentSlide].image}
                  alt={slides[currentSlide].title}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
              </div>

              <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-10 md:px-20 text-white max-w-2xl pb-10 sm:pb-0">
                <motion.span
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 bg-[#22c55e] text-white text-[10px] font-black rounded-lg mb-3 sm:mb-6 w-fit uppercase tracking-[0.2em] shadow-lg shadow-green-500/20"
                >
                  {slides[currentSlide].tag}
                </motion.span>

                <motion.h2
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl sm:text-4xl md:text-6xl font-black mb-3 sm:mb-6 leading-[0.95] sm:leading-[0.9] tracking-tighter"
                >
                  {slides[currentSlide].title}
                </motion.h2>

                <motion.p
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm sm:text-lg text-gray-300 mb-5 sm:mb-10 max-w-sm font-medium leading-relaxed line-clamp-2 sm:line-clamp-none"
                >
                  {slides[currentSlide].description}
                </motion.p>

                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                  <Link
                    href={slides[currentSlide].primaryLink}
                    className="group relative bg-white text-gray-900 px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest w-fit inline-flex items-center gap-3 overflow-hidden transition-all hover:pr-12 min-h-11"
                  >
                    <span className="relative z-10">{slides[currentSlide].primaryBtn}</span>
                    <span className="relative z-10 group-hover:translate-x-1 transition-transform">→</span>
                    <div className="absolute inset-0 bg-green-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-4 left-5 sm:bottom-10 sm:left-10 md:left-20 z-20 flex gap-1 sm:gap-3 items-center">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className="relative flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 p-2"
              >
                <div
                  className={`h-1 transition-all duration-300 rounded-full ${
                    idx === currentSlide ? "w-8 sm:w-10 bg-white" : "w-3 sm:w-4 bg-white/30 hover:bg-white/50"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
