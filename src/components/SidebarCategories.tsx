"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarCategoriesProps {
    categories: string[];
}

export const CATEGORY_ICONS: Record<string, string> = {
    'Animal Feeds': '🐄',
    'Fertilizers': '📦',
    'Seeds': '🌱',
    'Seeds & Seedlings': '🌱',
    'Crop Protection Products': '🛡️',
    'Crop Protection': '🛡️',
    'Pesticides': '🛡️',
    'Equipment': '🚜',
    'Machinery': '🚜',
    'Veterinary': '💊',
    'Veterinary Products': '💊',
    'Farm Tools': '🛠️',
};

export default function SidebarCategories({ categories }: SidebarCategoriesProps) {
    const pathname = usePathname();

    return (
        <aside className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Categories
                </h3>
            </div>

            <nav className="p-2">
                <ul className="space-y-1">
                    {categories.map((cat) => (
                        <li key={cat}>
                            <Link
                                href={`/products?category=${encodeURIComponent(cat)}`}
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-green-50 hover:text-green-600 transition-all group"
                            >
                                <span className="text-xl group-hover:scale-125 transition-transform">
                                    {CATEGORY_ICONS[cat] || "🌾"}
                                </span>
                                <span className="truncate">{cat}</span>
                            </Link>
                        </li>
                    ))}

                    <li className="pt-2 border-t border-gray-50 mt-2">
                        <Link
                            href="/products"
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black text-green-600 uppercase tracking-widest hover:bg-green-100 transition-all border border-dashed border-green-200"
                        >
                            <span>📦</span>
                            <span>Shop All Products</span>
                        </Link>
                    </li>
                </ul>
            </nav>

            <div className="p-6 bg-green-50/50">
                <p className="text-[10px] font-bold text-green-800 uppercase tracking-tighter mb-1">Need Help?</p>
                <p className="text-[9px] text-green-700/70 leading-tight">Can't find what you need? Talk to our agronomy experts.</p>
            </div>
        </aside>
    );
}
