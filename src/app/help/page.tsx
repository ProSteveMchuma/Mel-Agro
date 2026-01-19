"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState } from "react";

const faqCategories = [
    {
        id: "ordering-payments",
        label: "Ordering & Payments",
        icon: "💳",
        faqs: [
            {
                question: "How do I pay using M-PESA?",
                answer: "To pay via M-PESA, select MPESA at checkout. You will receive a prompt on your phone. Enter your M-Pesa PIN to complete the payment. Account: Your Order Number. Once payment is confirmed, you'll receive SMS and email notification."
            },
            {
                question: "Do you deliver to upcountry locations?",
                answer: "Yes, we deliver countrywide. Delivery costs vary based on your location. See our delivery information page for estimated costs and delivery times."
            },
            {
                question: "Can I return items if I bought the wrong variety?",
                answer: "Yes! We have a 14-day return policy for unopened items. Contact support with your order number and reason for return."
            }
        ]
    },
    {
        id: "shipping-delivery",
        label: "Shipping & Delivery",
        icon: "🚚",
        faqs: [
            {
                question: "What shipping methods are available?",
                answer: "We offer Standard Delivery (1-3 business days) at KES 400 and Pick-up Station option at KES 100. Select your preferred method during checkout."
            },
            {
                question: "How do I track my delivery?",
                answer: "Once your order ships, you'll receive a tracking link via email and SMS. You can also track your order from your account dashboard."
            },
            {
                question: "What happens if my item arrives damaged?",
                answer: "If your item arrives damaged, contact our support team immediately with photos. We'll arrange a replacement or refund within 48 hours."
            }
        ]
    },
    {
        id: "product-info",
        label: "Product Info",
        icon: "🌱",
        faqs: [
            {
                question: "Are your fertilizers and seeds certified?",
                answer: "Yes, all our products are certified genuine from authorized manufacturers. We only stock quality agricultural inputs."
            },
            {
                question: "How should I store farm inputs?",
                answer: "Store in a cool, dry place away from direct sunlight. Fertilizers should be kept away from moisture. See product packaging for specific storage instructions."
            },
            {
                question: "Can I get farming advice for my products?",
                answer: "Absolutely! Call our agricultural experts at +254 700 123 456. They provide free consultation on product usage and farming techniques."
            }
        ]
    },
    {
        id: "account",
        label: "My Account",
        icon: "👤",
        faqs: [
            {
                question: "How do I create a Makamithi account?",
                answer: "Click 'Sign Up' on the homepage. Enter your email and password. Once verified, you can start shopping immediately."
            },
            {
                question: "I forgot my password. How do I reset it?",
                answer: "Click 'Forgot Password' on the login page. Enter your email and follow the reset link sent to your inbox."
            },
            {
                question: "Can I have multiple addresses?",
                answer: "Yes! You can save multiple delivery addresses in your account. This is useful if you have multiple farms or offices."
            }
        ]
    }
];

export default function HelpCenterPage() {
    const [selectedCategory, setSelectedCategory] = useState("ordering-payments");
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    const currentCategory = faqCategories.find(cat => cat.id === selectedCategory);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How can we help you?</h1>
                        <p className="text-lg text-gray-600 mb-8">Find answers to common questions about orders, M-PESA payments, delivery, and agro inputs</p>

                        {/* Search Bar */}
                        <div className="max-w-2xl mx-auto mb-12">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search for answers (e.g., 'Delivery fees', 'M-PESA')"
                                    className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-melagro-primary focus:border-transparent"
                                />
                                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-melagro-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-melagro-secondary transition-colors">
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Hero Banner */}
                    <div className="bg-gradient-to-r from-melagro-primary/10 to-melagro-secondary/10 rounded-2xl p-12 mb-16 border border-melagro-primary/20">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Browse by Category</h2>
                        <p className="text-gray-600 text-center mb-8">Select a topic to find relevant answers about our services</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {faqCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`p-6 rounded-xl transition-all font-semibold text-center ${
                                        selectedCategory === cat.id
                                            ? 'bg-melagro-primary text-white shadow-lg'
                                            : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
                                    }`}
                                >
                                    <div className="text-3xl mb-2">{cat.icon}</div>
                                    <p className="text-sm md:text-base">{cat.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FAQs */}
                    <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 mb-16">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-gray-900">{currentCategory?.label}</h2>
                            <p className="text-gray-600 mt-2">Frequently asked questions about {currentCategory?.label.toLowerCase()}</p>
                        </div>

                        <div className="space-y-4">
                            {currentCategory?.faqs.map((faq, idx) => (
                                <div
                                    key={idx}
                                    className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                                >
                                    <button
                                        onClick={() => setExpandedFaq(expandedFaq === `${selectedCategory}-${idx}` ? null : `${selectedCategory}-${idx}`)}
                                        className="w-full px-6 py-4 md:py-6 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                                    >
                                        <h3 className="font-bold text-gray-900 text-base md:text-lg">{faq.question}</h3>
                                        <svg
                                            className={`w-6 h-6 text-melagro-primary transition-transform flex-shrink-0 ml-4 ${
                                                expandedFaq === `${selectedCategory}-${idx}` ? 'rotate-180' : ''
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </button>

                                    {expandedFaq === `${selectedCategory}-${idx}` && (
                                        <div className="px-6 py-4 md:py-6 bg-white border-t border-gray-200">
                                            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Still Need Help */}
                    <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Contact Options */}
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Still need help?</h3>
                                <p className="text-gray-600 mb-8">Our agricultural experts and support team are available Monday - Friday, 8am - 5pm</p>

                                <div className="space-y-4">
                                    <button className="w-full flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors group">
                                        <span className="text-3xl">💬</span>
                                        <div className="text-left flex-1">
                                            <p className="font-bold text-gray-900">WhatsApp</p>
                                            <p className="text-sm text-gray-600">Chat with support team</p>
                                        </div>
                                        <span className="text-melagro-primary group-hover:translate-x-1 transition-transform">→</span>
                                    </button>

                                    <button className="w-full flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors group">
                                        <span className="text-3xl">📞</span>
                                        <div className="text-left flex-1">
                                            <p className="font-bold text-gray-900">Call Us</p>
                                            <p className="text-sm text-gray-600">+254 700 123 456</p>
                                        </div>
                                        <span className="text-melagro-primary group-hover:translate-x-1 transition-transform">→</span>
                                    </button>

                                    <button className="w-full flex items-center gap-4 p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors group">
                                        <span className="text-3xl">📧</span>
                                        <div className="text-left flex-1">
                                            <p className="font-bold text-gray-900">Email</p>
                                            <p className="text-sm text-gray-600">support@melagro.com</p>
                                        </div>
                                        <span className="text-melagro-primary group-hover:translate-x-1 transition-transform">→</span>
                                    </button>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Quick Links</h3>
                                <nav className="space-y-3">
                                    {[
                                        { label: "Browse Products", href: "/products", icon: "🛍️" },
                                        { label: "Track Your Order", href: "/dashboard/user?tab=orders", icon: "📦" },
                                        { label: "Return an Item", href: "/contact", icon: "🔄" },
                                        { label: "Contact Us", href: "/contact", icon: "💬" },
                                        { label: "About Makamithi", href: "/about", icon: "ℹ️" }
                                    ].map((link, idx) => (
                                        <Link
                                            key={idx}
                                            href={link.href}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                        >
                                            <span className="text-xl">{link.icon}</span>
                                            <span className="font-semibold text-gray-900 group-hover:text-melagro-primary transition-colors">
                                                {link.label}
                                            </span>
                                            <span className="ml-auto text-melagro-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                        </Link>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
