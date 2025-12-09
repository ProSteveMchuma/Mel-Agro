"use client";

import Link from "next/link";
import Image from "next/image";

const CATEGORIES = [
    { name: 'Fertilizers', icon: 'https://cdn-icons-png.flaticon.com/512/2823/2823521.png', link: '/products?category=fertilizers' }, // Generic placeholder icons
    { name: 'Seeds', icon: 'https://cdn-icons-png.flaticon.com/512/1087/1087815.png', link: '/products?category=seeds' },
    { name: 'Tools', icon: 'https://cdn-icons-png.flaticon.com/512/608/608859.png', link: '/products?category=tools' },
    { name: 'Feeds', icon: 'https://cdn-icons-png.flaticon.com/512/2603/2603837.png', link: '/products?category=feeds' },
    { name: 'Pesticides', icon: 'https://cdn-icons-png.flaticon.com/512/2767/2767146.png', link: '/products?category=protection' },
    { name: 'Machinery', icon: 'https://cdn-icons-png.flaticon.com/512/2361/2361664.png', link: '/products?category=machinery' },
];

export default function CategoryIcons() {
    return (
        <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3 px-1 uppercase tracking-wider">Categories</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {CATEGORIES.map((cat) => (
                    <Link
                        key={cat.name}
                        href={cat.link}
                        className="flex flex-col items-center flex-shrink-0 w-20 snap-start"
                    >
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center p-3 mb-2 border border-gray-100 hover:border-melagro-primary hover:shadow-md transition-all">
                            <Image
                                src={cat.icon}
                                alt={cat.name}
                                width={40}
                                height={40}
                                className="object-contain opacity-80"
                            />
                        </div>
                        <span className="text-[11px] font-medium text-gray-700 text-center leading-tight truncate w-full px-1">
                            {cat.name}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
