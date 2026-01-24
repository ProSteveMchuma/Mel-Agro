"use client";

import { motion } from "framer-motion";

const PARTNERS = [
    { name: "Bayer", logo: "/assets/partners/bayer.png", url: "https://www.bayer.com" },
    { name: "Syngenta", logo: "/assets/partners/syngenta.png", url: "https://www.syngenta.com" },
    { name: "Corteva", logo: "/assets/partners/corteva.png", url: "https://www.corteva.com" },
    { name: "Seed Co", logo: "/assets/partners/seedco.png", url: "https://www.seedcogroup.com" },
    { name: "Unga PLC", logo: "/assets/partners/unga.png", url: "https://www.unga-group.com" },
    { name: "Osho Chemicals", logo: "/assets/partners/osho.png", url: "https://www.oshochemicals.com" },
];

export default function Partners() {
    return (
        <section className="py-20 bg-white overflow-hidden">
            <div className="container-custom mb-12 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-4 mb-4"
                >
                    <div className="h-px w-8 bg-gray-200" />
                    <p className="text-[10px] font-black tracking-[0.3em] text-gray-400 uppercase">Strategic Partnerships</p>
                    <div className="h-px w-8 bg-gray-200" />
                </motion.div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Trusted by Global Agricultural Leaders</h2>
            </div>

            <div className="relative">
                {/* Fade Gradients */}
                <div className="absolute left-0 inset-y-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
                <div className="absolute right-0 inset-y-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />

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
                                whileHover={{ scale: 1.1 }}
                                className="relative w-40 h-16 opacity-80 hover:opacity-100 transition-all duration-500 group cursor-pointer"
                            >
                                <img
                                    src={partner.logo}
                                    alt={partner.name}
                                    className="w-full h-full object-contain"
                                />
                            </motion.a>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
