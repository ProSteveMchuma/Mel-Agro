"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function MobileNav() {
    const pathname = usePathname();
    const { cartItems } = useCart();
    const { user } = useAuth();

    // Don't show on checkout as it has its own bottom bar
    // Also hide on individual product pages (e.g., /products/123) to avoid conflict with sticky "Add to Cart"
    if (pathname === '/checkout' || (pathname.startsWith('/products/') && pathname !== '/products')) return null;

    const navItems = [
        {
            name: 'Home',
            href: '/',
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'fill-melagri-primary' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
                    {active ? (
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    )}
                </svg>
            )
        },
        {
            name: 'Shop',
            href: '/products',
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'fill-melagri-primary' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
                    {active ? (
                        <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 14a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2zM4 14a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    )}
                </svg>
            )
        },
        {
            name: 'Cart',
            href: '/cart',
            icon: (active: boolean) => (
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'fill-melagri-primary' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
                        {active ? (
                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        )}
                    </svg>
                    {cartItems.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-full font-bold">
                            {cartItems.length}
                        </span>
                    )}
                </div>
            )
        },
        {
            name: user ? 'Account' : 'Login',
            href: user ? '/dashboard/user' : '/auth/login',
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'fill-melagri-primary' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
                    {active ? (
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    )}
                </svg>
            )
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-[0_-5px_20px_rgba(0,0,0,0.03)] lg:hidden z-50 safe-area-bottom pb-safe">
            <div className="flex items-center justify-around">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center py-3 px-2 w-full transition-colors ${isActive ? 'text-melagri-primary' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {item.icon(isActive)}
                            <span className="text-[10px] font-medium mt-1">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
