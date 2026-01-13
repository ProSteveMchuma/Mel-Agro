"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState } from "react";

export default function UserDashboard() {
    const [activeTab, setActiveTab] = useState('overview');

    const user = {
        name: "John Doe",
        email: "john@example.com",
        phone: "+254 701 234 567"
    };

    const stats = [
        { label: "Active Orders", value: "2", icon: "📦", color: "bg-blue-50 text-blue-600" },
        { label: "Total Spent", value: "KES 45,000", icon: "💰", color: "bg-green-50 text-green-600" },
        { label: "Wishlist Items", value: "12", icon: "❤️", color: "bg-red-50 text-red-600" }
    ];

    const recentOrders = [
        { id: "ORD-1234", date: "Oct 24, 2023", status: "Processing", total: "KES 8,500", items: 3 },
        { id: "ORD-1233", date: "Oct 23, 2023", status: "Delivered", total: "KES 12,000", items: 2 },
        { id: "ORD-1232", date: "Oct 20, 2023", status: "Delivered", total: "KES 6,500", items: 1 }
    ];

    const addresses = [
        { id: 1, label: "Home (Default)", address: "Nairobi, Off Duke Road, Nairobi, Kenya", phone: "+254 712 345 678" },
        { label: "Farm", address: "Farm Manager, Peter Kariuki, South Lake Road, Nairobi, Kenya", phone: "+254 722 340 678" }
    ];

    const recommendedProducts = [
        { id: 1, name: "DAP Fertilizer - 17-17", price: "KES 3,500", image: "🥕" },
        { id: 2, name: "Hybrid Tomato Seeds", price: "KES 850", image: "🌿" },
        { id: 3, name: "Knapsack Sprayer", price: "KES 2,500", image: "💦" }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 sticky top-20 h-fit">
                                {/* User Info */}
                                <div className="mb-8 pb-6 border-b">
                                    <div className="w-16 h-16 bg-gradient-to-br from-melagro-primary to-melagro-secondary rounded-full flex items-center justify-center text-white font-bold text-xl mb-3">
                                        {user.name.charAt(0)}
                                    </div>
                                    <h3 className="font-bold text-gray-900">{user.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                                </div>

                                {/* Navigation */}
                                <nav className="space-y-2">
                                    {[
                                        { id: 'overview', label: '🏠 Dashboard', icon: '🏠' },
                                        { id: 'orders', label: '📦 My Orders', icon: '📦' },
                                        { id: 'wishlist', label: '❤️ Wishlist (12)', icon: '❤️' },
                                        { id: 'addresses', label: '📍 Addresses', icon: '📍' },
                                        { id: 'payments', label: '💳 Payment Methods', icon: '💳' },
                                        { id: 'account', label: '⚙️ Account Details', icon: '⚙️' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                                                activeTab === item.id
                                                    ? 'bg-melagro-primary/10 text-melagro-primary'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>

                                {/* Logout */}
                                <div className="mt-6 pt-6 border-t">
                                    <button className="w-full text-red-600 hover:text-red-700 font-semibold py-2 transition-colors flex items-center gap-2 justify-center">
                                        <span>🚪</span> Log Out
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="lg:col-span-3">
                            {/* Dashboard Overview */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8">
                                    {/* Greeting */}
                                    <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Jambo, John! 👋</h1>
                                        <p className="text-gray-600">Here's what's happening with your farm inputs today.</p>
                                    </div>

                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {stats.map((stat, idx) => (
                                            <div key={idx} className={`${stat.color} rounded-2xl p-6 border border-gray-200`}>
                                                <div className="text-3xl mb-2">{stat.icon}</div>
                                                <p className="text-sm font-semibold text-gray-600 mb-1">{stat.label}</p>
                                                <p className="text-2xl font-bold">{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Quick Action & Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* New Order & Profile */}
                                        <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                            <h3 className="font-bold text-gray-900 mb-6">Quick Actions</h3>
                                            <div className="space-y-3">
                                                <Link href="/products" className="w-full bg-melagro-primary hover:bg-melagro-secondary text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-between">
                                                    + New Order
                                                    <span>→</span>
                                                </Link>
                                                <button className="w-full border-2 border-gray-300 text-gray-900 px-4 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors flex items-center justify-between">
                                                    Update Profile
                                                    <span>→</span>
                                                </button>
                                            </div>

                                            {/* Profile Completion */}
                                            <div className="mt-8 pt-8 border-t">
                                                <p className="text-sm font-semibold text-gray-900 mb-3">Complete your profile</p>
                                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                                    <p className="text-xs text-gray-600 mb-3">Add your farming details to get personalized recommendations</p>
                                                    <button className="w-full bg-melagro-primary text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-melagro-secondary transition-colors">
                                                        Complete Now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recent Orders */}
                                        <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="font-bold text-gray-900">Recent Orders</h3>
                                                <Link href="#" className="text-melagro-primary hover:underline text-sm font-semibold">View All</Link>
                                            </div>
                                            <div className="space-y-3">
                                                {recentOrders.map((order, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{order.id}</p>
                                                            <p className="text-xs text-gray-500">{order.date}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-bold text-gray-900">{order.status}</p>
                                                            <p className="text-sm font-bold text-melagro-primary">{order.total}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recommended Products */}
                                    <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                        <h3 className="font-bold text-gray-900 mb-6">Recommended for you</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {recommendedProducts.map((product, idx) => (
                                                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer text-center">
                                                    <div className="text-4xl mb-3">{product.image}</div>
                                                    <p className="font-semibold text-gray-900 text-sm mb-1">{product.name}</p>
                                                    <p className="text-melagro-primary font-bold mb-3">{product.price}</p>
                                                    <button className="w-full bg-green-100 text-melagro-primary px-3 py-2 rounded-lg font-bold text-sm hover:bg-green-200 transition-colors">
                                                        Add to Cart
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Orders Tab */}
                            {activeTab === 'orders' && (
                                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="border-b border-gray-200">
                                                <tr>
                                                    <th className="text-left py-3 font-bold text-gray-900">ORDER ID</th>
                                                    <th className="text-left py-3 font-bold text-gray-900">DATE</th>
                                                    <th className="text-left py-3 font-bold text-gray-900">STATUS</th>
                                                    <th className="text-left py-3 font-bold text-gray-900">TOTAL</th>
                                                    <th className="text-left py-3 font-bold text-gray-900">ACTION</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {recentOrders.map((order, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="py-4 font-semibold text-gray-900">{order.id}</td>
                                                        <td className="py-4 text-gray-600">{order.date}</td>
                                                        <td className="py-4">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                                order.status === 'Delivered'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 font-bold text-gray-900">{order.total}</td>
                                                        <td className="py-4">
                                                            <Link href={`/orders/${order.id}`} className="text-melagro-primary hover:underline font-semibold text-sm">
                                                                View
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Addresses Tab */}
                            {activeTab === 'addresses' && (
                                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold text-gray-900">My Addresses</h2>
                                        <button className="bg-melagro-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-melagro-secondary transition-colors">
                                            + Add New
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {addresses.map((addr, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-4">
                                                    <h3 className="font-bold text-gray-900">{addr.label}</h3>
                                                    <button className="text-melagro-primary hover:underline text-sm font-semibold">Edit</button>
                                                </div>
                                                <p className="text-gray-600 text-sm mb-1">{addr.address}</p>
                                                <p className="text-gray-600 text-sm">{addr.phone}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
