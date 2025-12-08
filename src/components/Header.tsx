"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import SmartSearch from "./SmartSearch";
import { useLanguage } from "@/context/LanguageContext";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartCount, toggleCart } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();

  const userLink = user
    ? (isAdmin ? "/dashboard/admin" : "/dashboard/user")
    : "/auth/login";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="container-custom py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-melagro-primary rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-melagro-secondary transition-colors">
              M
            </div>
            <span className="text-2xl font-bold text-melagro-primary tracking-tight">
              MelAgro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-gray-600 hover:text-melagro-primary font-medium transition-colors">
              {t('nav.home')}
            </Link>
            <Link href="/products" className="text-gray-600 hover:text-melagro-primary font-medium transition-colors">
              {t('nav.products')}
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-melagro-primary font-medium transition-colors">
              {t('nav.about')}
            </Link>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-bold rounded ${language === 'en' ? 'bg-white shadow-sm text-melagro-primary' : 'text-gray-500'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('sw')}
                className={`px-2 py-1 text-xs font-bold rounded ${language === 'sw' ? 'bg-white shadow-sm text-melagro-primary' : 'text-gray-500'}`}
              >
                SW
              </button>
            </div>
          </nav>

          {/* Search & Actions */}
          <div className="hidden md:flex items-center gap-4">

            <SmartSearch />

            <Link href="/dashboard/user?tab=orders" className="p-2 text-gray-600 hover:text-melagro-primary transition-colors relative" title="Track Order">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </Link>

            <Link href="/wishlist" className="p-2 text-gray-600 hover:text-melagro-primary transition-colors relative" title="Wishlist">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </Link>

            <button
              onClick={toggleCart}
              className="p-2 text-gray-600 hover:text-melagro-primary transition-colors relative"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-melagro-accent text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative group">
                <button className="p-2 text-gray-600 hover:text-melagro-primary transition-colors flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <div className="font-bold text-gray-900 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    {user.loyaltyPoints !== undefined && (
                      <div className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
                        <span>🎁 {user.loyaltyPoints} Pts</span>
                      </div>
                    )}
                  </div>
                  <Link href={userLink} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    {t('nav.dashboard')}
                  </Link>
                  <Link href="/dashboard/user?tab=orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    My Orders
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/auth/login" className="p-2 text-gray-600 hover:text-melagro-primary transition-colors font-medium">
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2">
            <Link href="/" className="block text-gray-600 hover:text-melagro-primary font-medium">
              {t('nav.home')}
            </Link>
            <Link href="/products" className="block text-gray-600 hover:text-melagro-primary font-medium">
              {t('nav.products')}
            </Link>
            <Link href="/about" className="block text-gray-600 hover:text-melagro-primary font-medium">
              {t('nav.about')}
            </Link>
            <div className="flex gap-4 items-center">
              <span className="text-sm font-medium text-gray-600">Language:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 text-xs font-bold rounded ${language === 'en' ? 'bg-white shadow-sm text-melagro-primary' : 'text-gray-500'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('sw')}
                  className={`px-3 py-1 text-xs font-bold rounded ${language === 'sw' ? 'bg-white shadow-sm text-melagro-primary' : 'text-gray-500'}`}
                >
                  Swahili
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
