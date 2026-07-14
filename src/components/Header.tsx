"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import SmartSearch from "./SmartSearch";

import Logo from "./Logo";

export default function Header() {
  const { cartCount, toggleCart } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();

  // Dropdown states
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Refs for click outside
  const accountRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const userLink = user
    ? (isAdmin ? "/dashboard/admin" : "/dashboard/user")
    : "/auth/login";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setIsHelpOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
        setIsHelpOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

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
            <Link href="/" aria-label="Mel-Agri home" className="group flex-shrink-0 origin-left transform scale-75 md:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-4 rounded-lg">
              <Logo />
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-grow max-w-2xl relative justify-center">
            <SmartSearch />
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-6">
            {/* Account Dropdown */}
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                className="hidden lg:flex min-h-11 items-center gap-2 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                aria-haspopup="menu"
                aria-expanded={isAccountOpen}
                aria-controls="account-menu"
              >
                <div className="p-2 bg-gray-50 rounded-full group-hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold leading-tight">Hello, {user ? user.name?.split(' ')[0] : 'Sign In'}</p>
                  <p className="text-sm font-black text-gray-900 flex items-center gap-1">
                    Account
                    <svg className={`w-3 h-3 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </p>
                </div>
              </button>

              {/* Account Dropdown Menu */}
              {isAccountOpen && (
                <div id="account-menu" role="menu" aria-label="Account" className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 animate-in fade-in slide-in-from-top-2 z-50">
                  {user ? (
                    <>
                      <Link
                        href="/dashboard/user"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium"
                        onClick={() => setIsAccountOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/dashboard/user?tab=orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium"
                        onClick={() => setIsAccountOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link
                        href="/dashboard/user?tab=wishlist"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium"
                        onClick={() => setIsAccountOpen(false)}
                      >
                        Wishlist
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/dashboard/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium border-t border-gray-50"
                          onClick={() => setIsAccountOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => { handleLogout(); setIsAccountOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold border-t border-gray-50 mt-1"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/signup"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium"
                        onClick={() => setIsAccountOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/auth/login"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium"
                        onClick={() => setIsAccountOpen(false)}
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Account Icon (Visible only on mobile) */}
            <Link href={userLink} aria-label={user ? "Open account" : "Sign in or create an account"} className="lg:hidden min-h-11 min-w-11 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </Link>

            {/* Guides Link */}
            <Link href="/guides" className="hidden lg:flex items-center gap-2 group hover:text-[#22c55e] transition-colors">
              <svg className="w-6 h-6 text-gray-600 group-hover:text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <p className="text-sm font-black text-gray-900 flex items-center gap-1 group-hover:text-[#22c55e]">
                Guides
              </p>
            </Link>

            {/* Help Dropdown */}
            <div className="relative" ref={helpRef}>
              <button
                type="button"
                className="hidden lg:flex min-h-11 items-center gap-2 group rounded-xl hover:text-[#22c55e] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                onClick={() => setIsHelpOpen(!isHelpOpen)}
                aria-haspopup="menu"
                aria-expanded={isHelpOpen}
                aria-controls="help-menu"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm font-black text-gray-900 flex items-center gap-1 group-hover:text-[#22c55e]">
                  Help
                  <svg className={`w-3 h-3 transition-transform ${isHelpOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </p>
              </button>

              {/* Help Dropdown Menu */}
              {isHelpOpen && (
                <div id="help-menu" role="menu" aria-label="Help" className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 animate-in fade-in slide-in-from-top-2 z-50">
                  <Link
                    href="/help"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium"
                    onClick={() => setIsHelpOpen(false)}
                  >
                    Help Center
                  </Link>
                  <Link
                    href="/contact"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium"
                    onClick={() => setIsHelpOpen(false)}
                  >
                    Contact Us
                  </Link>
                  <Link
                    href="/help"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium"
                    onClick={() => setIsHelpOpen(false)}
                  >
                    FAQs
                  </Link>
                  <Link
                    href="/privacy"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-melagri-primary font-medium border-t border-gray-50"
                    onClick={() => setIsHelpOpen(false)}
                  >
                    Privacy Policy
                  </Link>
                </div>
              )}
            </div>

            {/* Cart */}
            <button type="button" onClick={toggleCart} aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} items` : ""}`} className="min-h-11 flex items-center gap-2 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2">
              <div className="relative p-2 bg-gray-50 rounded-full group-hover:bg-gray-100 transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {cartCount > 0 && (
                  <span aria-hidden="true" className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-md border-2 border-white">
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
