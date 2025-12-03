"use client";
import { useState } from "react";
import { SalesReportTemplate } from "@/components/documents/SalesReportTemplate";
import { useOrders } from "@/context/OrderContext";
import { useProducts } from "@/context/ProductContext";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/context/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnalyticsCharts from "@/components/admin/AnalyticsCharts";

export default function AdminDashboard() {
    const { orders } = useOrders();
    const { products } = useProducts();
    const { user } = useAuth();
    const { users } = useUsers();
    const router = useRouter();
    const [showReport, setShowReport] = useState(false);

    // Calculate Stats
    const totalSales = orders.reduce((acc, order) => acc + order.total, 0);
    const activeOrders = orders.filter(o => o.status === 'Processing' || o.status === 'Shipped').length;
    const pendingShipments = orders.filter(o => o.status === 'Processing').length;

    const totalUsers = users.length;

    const handlePrintReport = () => {
        setShowReport(true);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    return (
        <div className="space-y-8">
            {/* Print Overlay */}
            {showReport && (
                <div className="fixed inset-0 z-[100] bg-white overflow-auto print:overflow-visible">
                    <div className="p-4 print:hidden flex justify-between items-center bg-gray-900 text-white sticky top-0">
                        <div className="font-bold">Print Preview: Sales Report</div>
                        <div className="flex gap-4">
                            <button onClick={() => window.print()} className="bg-melagro-primary px-4 py-2 rounded-lg hover:bg-melagro-secondary">Print Now</button>
                            <button onClick={() => setShowReport(false)} className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600">Close</button>
                        </div>
                    </div>
                    <div className="p-8 print:p-0">
                        <SalesReportTemplate orders={orders} />
                    </div>
                </div>
            )}

            <div className="flex justify-between items-end print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-500 mt-1">Welcome back, here's what's happening with your store today.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handlePrintReport} className="btn-secondary text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Download Report
                    </button>
                    <Link href="/dashboard/admin/products/new" className="btn-primary text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Product
                    </Link>
                </div>
            </div>

            {/* Alerts */}
            {/* Alerts */}
            <div className="space-y-4 print:hidden">
                {products.some(p => !p.inStock) && (
                    <Link href="/dashboard/admin/products" className="block bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg hover:bg-red-100 transition-colors cursor-pointer group">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-500 group-hover:text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 group-hover:text-red-900">Out of Stock</h3>
                                <div className="mt-2 text-sm text-red-700 group-hover:text-red-800">
                                    <p>You have {products.filter(p => !p.inStock).length} products out of stock.</p>
                                </div>
                            </div>
                            <div className="ml-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                )}

                {products.some(p => p.inStock && p.stockQuantity <= (p.lowStockThreshold || 10)) && (
                    <Link href="/dashboard/admin/products" className="block bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg hover:bg-yellow-100 transition-colors cursor-pointer group">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-500 group-hover:text-yellow-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800 group-hover:text-yellow-900">Low Stock Warning</h3>
                                <div className="mt-2 text-sm text-yellow-700 group-hover:text-yellow-800">
                                    <p>You have {products.filter(p => p.inStock && p.stockQuantity <= (p.lowStockThreshold || 10)).length} products running low.</p>
                                </div>
                            </div>
                            <div className="ml-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 group-hover:text-yellow-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
                <Link href="/dashboard/admin/orders" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.5%</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">KES {totalSales.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Total Revenue</div>
                </Link>

                <Link href="/dashboard/admin/orders" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">+5.2%</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{orders.length}</div>
                    <div className="text-sm text-gray-500">Total Orders</div>
                </Link>

                <Link href="/dashboard/admin/products" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 group-hover:bg-orange-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full">0%</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{products.length}</div>
                    <div className="text-sm text-gray-500">Products in Stock</div>
                </Link>

                <Link href="/dashboard/admin/users" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">+8.1%</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{totalUsers}</div>
                    <div className="text-sm text-gray-500">Active Customers</div>
                </Link>
            </div>

            {/* Analytics Charts */}
            <div className="print:hidden">
                <AnalyticsCharts orders={orders} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
                {/* Recent Orders */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-900">Recent Orders</h2>
                        <Link href="/dashboard/admin/orders" className="text-sm text-melagro-primary hover:underline">View All</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Order ID</th>
                                    <th className="px-6 py-3 font-medium">Customer</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.slice(0, 5).map(order => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/dashboard/admin/orders/${order.id}`)}
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900">#{order.id}</td>
                                        <td className="px-6 py-4 text-gray-600">{order.userName || order.userEmail || order.userId}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                    order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">KES {order.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No orders yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900">Top Products</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {products.slice(0, 4).map(product => (
                            <Link
                                href={`/dashboard/admin/products/edit/${product.id}`}
                                key={product.id}
                                className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0">
                                    <img src={product.image} alt={product.name} className="object-cover w-full h-full" />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="font-medium text-gray-900 truncate group-hover:text-melagro-primary transition-colors">{product.name}</div>
                                    <div className="text-xs text-gray-500">{product.category}</div>
                                </div>
                                <div className="font-bold text-gray-900">KES {product.price.toLocaleString()}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
