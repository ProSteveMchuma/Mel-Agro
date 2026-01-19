"use client";

import Link from "next/link";
import Image from "next/image";

const CATEGORIES = [
    { name: 'Animal Feeds', image: 'https://images.unsplash.com/photo-1563205764-6e929f62334d?q=80&w=400&auto=format&fit=crop', link: '/products?category=Animal%20Feeds' },
    { name: 'Fertilizers', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=400&auto=format&fit=crop', link: '/products?category=Fertilizers' },
    { name: 'Seeds', image: 'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?q=80&w=400&auto=format&fit=crop', link: '/products?category=Seeds' },
    { name: 'Crop Protection Products', image: 'https://images.unsplash.com/photo-1615485925763-867862f80930?q=80&w=400&auto=format&fit=crop', link: '/products?category=Crop%20Protection%20Products' },
    { name: 'Veterinary Products', image: 'https://images.unsplash.com/photo-1591130219388-ae3d1c17431b?q=80&w=400&auto=format&fit=crop', link: '/products?category=Veterinary%20Products' },
];

export default function CategoryIcons() {
    return (
        <section className="py-8 bg-white">
            <div className="container-custom">
                <div className="flex flex-wrap justify-between gap-6">
                    {CATEGORIES.map((cat, idx) => (
                        <Link key={idx} href={cat.link} className="flex flex-col items-center group flex-1 min-w-[120px]">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden mb-3 border-2 border-transparent group-hover:border-green-500 transition-all shadow-sm">
                                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <span className="text-sm font-bold text-gray-700 group-hover:text-green-600 transition-colors uppercase tracking-tight">{cat.name}</span>
                        </Link>
                    ))}
                    {/* View All */}
                    <Link href="/products" className="flex flex-col items-center group flex-1 min-w-[120px]">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-green-50 flex items-center justify-center mb-3 border-2 border-transparent group-hover:border-green-500 transition-all shadow-sm">
                            <div className="w-10 h-10 rounded-full border-2 border-green-500 flex items-center justify-center text-green-500 text-2xl font-bold group-hover:bg-green-500 group-hover:text-white transition-all">
                                +
                            </div>
                        </div>
                        <span className="text-sm font-bold text-gray-700 group-hover:text-green-600 transition-colors uppercase tracking-tight">View All</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}
