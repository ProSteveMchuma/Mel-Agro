"use client";

import { motion } from "framer-motion";

const PARTNERS = [
    { name: "Bayer", domain: "bayer.com", fallback: "/assets/partners/bayer.png", url: "https://www.bayer.com" },
    { name: "Syngenta", domain: "syngenta.com", fallback: "/assets/partners/syngenta.png", url: "https://www.syngenta.com" },
    { name: "Corteva", domain: "corteva.com", fallback: "/assets/partners/corteva.png", url: "https://www.corteva.com" },
    { name: "Seed Co", domain: "seedcogroup.com", fallback: "/assets/partners/seedco.png", url: "https://www.seedcogroup.com" },
    { name: "Unga PLC", domain: "unga-group.com", fallback: "/assets/partners/unga.png", url: "https://www.unga-group.com" },
    { name: "Osho Chemicals", domain: "oshochemicals.com", fallback: "/assets/partners/osho.png", url: "https://www.oshochemicals.com" },
];

export default function Partners() {
    return (
        <section className="py-16 bg-gray-50 relative overflow-hidden rounded-[3rem] mx-4 md:mx-8 my-8 border border-gray-100 shadow-sm">
            <div className="container-custom mb-10 flex flex-col items-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-4 mb-4"
                >
                    <div className="h-px w-8 bg-gray-300" />
                    <p className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase">Strategic Partnerships</p>
                    <div className="h-px w-8 bg-gray-300" />
                </motion.div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Trusted by Global Agricultural Leaders</h2>
            </div>

            <div className="relative z-10">
                {/* Fade Gradients matching gray-50 background */}
                <div className="absolute left-0 inset-y-0 w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 inset-y-0 w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

                <div className="flex overflow-hidden">
                    <motion.div
                        animate={{ x: [0, -1035] }}
                        transition={{
                            x: {
                                repeat: Infinity,
                                repeatType: "loop",
                                duration: 30,
                                ease: "linear",
                            },
                        }}
                        className="flex items-center gap-20 py-4 px-10"
                    >
                        {/* Repeat twice for seamless loop */}
                        {[...PARTNERS, ...PARTNERS, ...PARTNERS].map((partner, index) => (
                            <motion.a
                                key={index}
                                href={partner.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.05, y: -5 }}
                                className="relative w-44 h-24 bg-white/50 hover:bg-white backdrop-blur-sm border border-gray-100/50 hover:border-green-100 flex shadow-sm hover:shadow-xl hover:shadow-green-500/10 items-center justify-center p-5 rounded-2xl transition-all duration-300 group cursor-pointer"
                            >
                                <img
                                    src={`https://logo.clearbit.com/${partner.domain}?size=200`}
                                    alt={partner.name}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = partner.fallback;
                                        (e.target as HTMLImageElement).onerror = null; // Prevent infinite loop if fallback fails
                                    }}
                                    className="max-w-full max-h-full object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                />
                            </motion.a>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
