"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import SmartSearch from "./SmartSearch";

import { useLanguage } from "@/context/LanguageContext";
import Logo from "./Logo";

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { cartCount, toggleCart } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();

  const userLink = user
    ? (isAdmin ? "/dashboard/admin" : "/dashboard/user")
    : "/auth/login";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
      {/* Top Bar */}
      <div className="bg-[#f0f9f1] py-1.5 md:py-2 border-b border-gray-100 hidden sm:block">
        <div className="container-custom flex justify-center items-center">
          <p className="text-[10px] md:text-xs font-medium text-gray-700 uppercase tracking-widest">
            FREE Delivery in Nairobi on orders over <span className="font-black text-green-700 underline decoration-green-300 decoration-2">KES 5,000!</span>
          </p>
        </div>
      </div>

      {/* Main Header */}
      <div className="container-custom py-3 md:py-4 shadow-sm">
        <div className="flex items-center gap-8 justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
            <Link href="/" className="group flex-shrink-0 origin-left transform scale-75 md:scale-100">
              <Logo />
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-grow max-w-2xl relative justify-center">
            <SmartSearch />
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-6">
            {/* Account */}
            <div className="hidden lg:flex items-center gap-2 group cursor-pointer">
              <div className="p-2 bg-gray-50 rounded-full group-hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div onClick={() => router.push(userLink)}>
                <p className="text-[10px] text-gray-500 font-bold leading-tight">Hello, {user ? user.name?.split(' ')[0] : 'Sign In'}</p>
                <p className="text-sm font-black text-gray-900 flex items-center gap-1">Account <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></p>
              </div>
            </div>

            {/* Mobile Account Icon (Visible only on mobile) */}
            <Link href={userLink} className="lg:hidden p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </Link>

            {/* Help */}
            <div className="hidden lg:flex items-center gap-2 group cursor-pointer hover:text-[#22c55e] transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-black text-gray-900 flex items-center gap-1">Help <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></p>
            </div>

            {/* Cart */}
            <button onClick={toggleCart} className="flex items-center gap-2 group">
              <div className="relative p-2 bg-gray-50 rounded-full group-hover:bg-gray-100 transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-md border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden lg:block text-sm font-black text-gray-900 uppercase tracking-widest">Cart</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar - Permanent (New) */}
      <div className="md:hidden container-custom py-2 pb-3 bg-white border-b border-gray-100">
        <SmartSearch />
      </div>
    </header>
  );
}
