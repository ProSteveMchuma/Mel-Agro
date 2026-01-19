"use client";

import Link from "next/link";
import Image from "next/image";

const CATEGORIES = [
    { name: 'Fertilizers', icon: 'https://cdn-icons-png.flaticon.com/512/2823/2823521.png', link: '/products?category=fertilizers', color: 'from-amber-50 to-orange-50' },
    { name: 'Seeds', icon: 'https://cdn-icons-png.flaticon.com/512/1087/1087815.png', link: '/products?category=seeds', color: 'from-green-50 to-emerald-50' },
    { name: 'Tools', icon: 'https://cdn-icons-png.flaticon.com/512/608/608859.png', link: '/products?category=tools', color: 'from-blue-50 to-cyan-50' },
    { name: 'Feeds', icon: 'https://cdn-icons-png.flaticon.com/512/2603/2603837.png', link: '/products?category=feeds', color: 'from-red-50 to-pink-50' },
    { name: 'Pesticides', icon: 'https://cdn-icons-png.flaticon.com/512/2767/2767146.png', link: '/products?category=protection', color: 'from-purple-50 to-indigo-50' },
    { name: 'Machinery', icon: 'https://cdn-icons-png.flaticon.com/512/2361/2361664.png', link: '/products?category=machinery', color: 'from-slate-50 to-gray-50' },
];

export default function CategoryIcons() {
    return (
        <div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {CATEGORIES.map((cat) => (
                    <Link
                        key={cat.name}
                        href={cat.link}
                        className="group"
                    >
                        <div className={`bg-gradient-to-br ${cat.color} rounded-2xl p-6 flex flex-col items-center justify-center aspect-square hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 hover:border-melagro-primary/30 cursor-pointer`}>
                            <div className="w-12 h-12 md:w-14 md:h-14 mb-2 relative">
                                <Image
                                    src={cat.icon}
                                    alt={cat.name}
                                    width={56}
                                    height={56}
                                    className="object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                            <span className="text-xs md:text-sm font-semibold text-gray-800 text-center group-hover:text-melagro-primary transition-colors">
                                {cat.name}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
