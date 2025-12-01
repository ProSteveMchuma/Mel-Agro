"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import SmartSearch from "./SmartSearch";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartCount, toggleCart } = useCart();
  const { user, isAdmin } = useAuth();
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
              Home
            </Link>
            <Link href="/products" className="text-gray-600 hover:text-melagro-primary font-medium transition-colors">
              Products
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-melagro-primary font-medium transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-melagro-primary font-medium transition-colors">
              Contact
            </Link>
          </nav>

          {/* Search & Actions */}
          <div className="hidden md:flex items-center gap-4">

            <SmartSearch />

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

            <Link href={userLink} className="p-2 text-gray-600 hover:text-melagro-primary transition-colors" title={user ? "Dashboard" : "Login"}>
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>
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
              Home
            </Link>
            <Link href="/products" className="block text-gray-600 hover:text-melagro-primary font-medium">
              Products
            </Link>
            <Link href="/about" className="block text-gray-600 hover:text-melagro-primary font-medium">
              About Us
            </Link>
            <Link href="/contact" className="block text-gray-600 hover:text-melagro-primary font-medium">
              Contact
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
