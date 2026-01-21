"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const CATEGORIES = [
    { name: 'Animal Feeds', image: 'https://images.unsplash.com/photo-1563205764-6e929f62334d?q=80&w=400&auto=format&fit=crop', link: '/products?category=Animal%20Feeds', icon: "🐄" },
    { name: 'Fertilizers', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=400&auto=format&fit=crop', link: '/products?category=Fertilizers', icon: "📦" },
    { name: 'Seeds', image: 'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?q=80&w=400&auto=format&fit=crop', link: '/products?category=Seeds', icon: "🌱" },
    { name: 'Crop Protection', image: 'https://images.unsplash.com/photo-1615485925763-867862f80930?q=80&w=400&auto=format&fit=crop', link: '/products?category=Crop%20Protection%20Products', icon: "🛡️" },
    { name: 'Veterinary', image: 'https://images.unsplash.com/photo-1591130219388-ae3d1c17431b?q=80&w=400&auto=format&fit=crop', link: '/products?category=Veterinary%20Products', icon: "💊" },
];

export default function CategoryIcons() {
    return (
        <section className="py-12 bg-white rounded-t-[3rem] -mt-8 relative z-30">
            <div className="container-custom">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {CATEGORIES.map((cat, idx) => (
                        <motion.div
                            key={idx}
                            whileHover={{ y: -8 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Link href={cat.link} className="flex flex-col items-center group">
                                <div className="w-full aspect-square rounded-[2rem] overflow-hidden mb-4 border border-gray-100 shadow-sm transition-shadow group-hover:shadow-2xl relative">
                                    <img
                                        src={cat.image}
                                        alt={cat.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl text-2xl">
                                            {cat.icon}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-gray-900 uppercase tracking-widest group-hover:text-green-600 transition-colors">{cat.name}</span>
                            </Link>
                        </motion.div>
                    ))}

                    {/* View All Card */}
                    <motion.div
                        whileHover={{ y: -8 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Link href="/products" className="flex flex-col items-center group h-full">
                            <div className="w-full aspect-square rounded-[2rem] bg-gray-50 flex flex-col items-center justify-center mb-4 border border-dashed border-gray-300 group-hover:bg-green-50 group-hover:border-green-300 transition-all">
                                <div className="w-12 h-12 rounded-full border-2 border-green-500 flex items-center justify-center text-green-500 text-2xl font-bold group-hover:bg-green-500 group-hover:text-white transition-all mb-2">
                                    +
                                </div>
                                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">See All</span>
                            </div>
                            <span className="text-xs font-black text-gray-900 uppercase tracking-widest">More Categories</span>
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
