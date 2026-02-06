"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import SmartSearch from "./SmartSearch";
import EnhancedSearch from "./EnhancedSearch";
import { useLanguage } from "@/context/LanguageContext";
import Logo from "./Logo";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
            <Link href="/" className="group flex-shrink-0">
              <Logo />
            </Link>
          </div>

          {/* Search Toggle - Mobile */}
          <div className="md:hidden flex-grow flex justify-end pr-2">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
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

      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="md:hidden fixed inset-0 z-[70] bg-white animate-in slide-in-from-top duration-300 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center gap-4">
            <div className="flex-grow relative z-50">
              <EnhancedSearch autoFocus={true} variant="mobile" />
            </div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="px-4 py-2 text-xs font-black text-gray-400 uppercase tracking-widest flex-shrink-0"
            >
              Close
            </button>
          </div>
          {/* EnhancedSearch handles its own suggestions and dropdowns */}
          <div className="flex-grow bg-gray-50/50 p-6 flex items-center justify-center text-gray-400 text-sm">
            Start typing to see results...
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}>
          <div
            className="absolute top-0 left-0 w-[85%] max-w-xs h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-900 text-white">
              <div className="scale-75 origin-left">
                <Logo light />
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <nav className="flex-grow py-4 px-4 overflow-y-auto">
              <div className="space-y-1 mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">Main Menu</p>
                <Link href="/" className="block px-3 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50 rounded-xl" onClick={() => setIsMenuOpen(false)}>Home</Link>
                <Link href="/products" className="block px-3 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50 rounded-xl" onClick={() => setIsMenuOpen(false)}>Shop All</Link>
                <Link href="/dashboard/user" className="block px-3 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50 rounded-xl" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                <Link href="/wishlist" className="block px-3 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50 rounded-xl" onClick={() => setIsMenuOpen(false)}>Wishlist</Link>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">Categories</p>
                {["Seeds", "Fertilizers", "Tools", "Animal Feeds", "Irrigation"].map((cat) => (
                  <Link
                    key={cat}
                    href={`/products?category=${cat}`}
                    className="block px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">{user ? user.name : 'Guest User'}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{user ? user.role : 'Welcome to Mel-Agri'}</p>
                </div>
              </div>
              {user ? (
                <button
                  onClick={() => { logout(); setIsMenuOpen(false); }}
                  className="w-full py-4 bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-red-100 transition-all border border-red-100"
                >
                  Log Out
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className="block w-full py-4 bg-green-600 text-white text-center text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
