"use client";
import { useState, useEffect } from "react";
import { SalesReportTemplate } from "@/components/documents/SalesReportTemplate";
import { useOrders } from "@/context/OrderContext";
import { useProducts } from "@/context/ProductContext";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnalyticsCharts from "@/components/admin/AnalyticsCharts";
import ReportsCenter from "@/components/admin/ReportsCenter";
import { collection, query, orderBy, limit, getDocs, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types";

interface SearchTerm {
    term: string;
    count: number;
}

interface ViewedProduct {
    productId: string;
    views: number;
    name: string;
    image?: string;
}

export default function AdminDashboard() {
    const { orders } = useOrders();
    const { products } = useProducts();
    const { user } = useAuth();
    const { users } = useUsers();
    const router = useRouter();

    // UI State
    const [showReportsCenter, setShowReportsCenter] = useState(false);

    // Analytics State
    const [topSearches, setTopSearches] = useState<SearchTerm[]>([]);
    const [topViewed, setTopViewed] = useState<ViewedProduct[]>([]);
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);

    // Calculate Stats
    const totalSales = orders
        .filter((order: any) => order.paymentStatus === 'Paid')
        .reduce((acc: number, order: any) => acc + order.total, 0);
    const totalUsers = users.length;


    // Fetch Analytics Data
    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Top Searches
                const searchQ = query(collection(db, 'analytics_search_terms'), orderBy('count', 'desc'), limit(5));
                const searchSnaps = await getDocs(searchQ);
                setTopSearches(searchSnaps.docs.map((d: QueryDocumentSnapshot) => d.data() as SearchTerm));

                // Top Products (by views)
                const viewQ = query(collection(db, 'analytics_products'), orderBy('views', 'desc'), limit(5));
                const viewSnaps = await getDocs(viewQ);

                // Merge with product details
                const viewedProducts = viewSnaps.docs.map((d: QueryDocumentSnapshot) => {
                    const data = d.data();
                    const product = products.find((p: Product) => p.id === data.productId);
                    return {
                        productId: data.productId,
                        views: data.views,
                        name: product?.name || 'Unknown Product',
                        image: product?.image
                    } as ViewedProduct;
                });

                setTopViewed(viewedProducts);
            } catch (err) {
                console.error("Error fetching analytics:", err);
            } finally {
                setLoadingAnalytics(false);
            }
        };

        if (products.length > 0) {
            fetchAnalytics();
        }
    }, [products]);

    return (
        <div className="space-y-8">
            {/* Reports Center Modal */}
            {showReportsCenter && (
                <ReportsCenter
                    orders={orders}
                    onClose={() => setShowReportsCenter(false)}
                />
            )}

            <div className="flex justify-between items-end print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-500 mt-1">Status: <span className="text-green-600 font-bold">Online</span> • Monitoring Activity</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/admin/reports" className="btn-secondary text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Financial Reports
                    </Link>
                    <Link href="/dashboard/admin/products/new" className="btn-primary text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Product
                    </Link>
                </div>
            </div>

            {/* LIVE INSIGHTS SECTION */}
            <div className="print:hidden">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-melagro-primary/10 rounded-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-melagro-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    Live Market Intelligence
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Top Searches Widget */}
                    <div className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white shadow-xl shadow-gray-900/5 hover:shadow-2xl transition-all duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">Top Search Terms</h3>
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">High Intent</span>
                        </div>
                        {loadingAnalytics ? (
                            <div className="space-y-4 animate-pulse">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-100/50 rounded-xl"></div>)}
                            </div>
                        ) : topSearches.length > 0 ? (
                            <div className="space-y-5">
                                {topSearches.map((term, i) => (
                                    <div key={i} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                                                {i + 1}
                                            </div>
                                            <span className="text-gray-900 font-bold capitalize text-sm">{term.term}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 bg-gray-100 w-24 md:w-32 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${Math.min(100, (term.count / (topSearches[0]?.count || 1)) * 100)}%` }}></div>
                                            </div>
                                            <span className="text-xs font-black text-gray-900 w-8 text-right">{term.count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-sm font-bold text-gray-400 italic">Awaiting first market signals...</p>
                            </div>
                        )}
                    </div>

                    {/* Top Viewed Widget */}
                    <div className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white shadow-xl shadow-gray-900/5 hover:shadow-2xl transition-all duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">Top Products by Interest</h3>
                            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">Popular Now</span>
                        </div>
                        {loadingAnalytics ? (
                            <div className="space-y-4 animate-pulse">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-100/50 rounded-xl"></div>)}
                            </div>
                        ) : topViewed.length > 0 ? (
                            <div className="space-y-5">
                                {topViewed.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push(`/dashboard/admin/products/edit/${item.productId}`)}>
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 relative overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-300 border border-white shadow-sm">
                                            {item.image && <img src={item.image} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="text-sm font-bold text-gray-900 truncate group-hover:text-melagro-primary transition-colors">{item.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Engagement Rank #{i + 1}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-black text-gray-900 px-3 py-1 bg-gray-100 rounded-lg">{item.views}</div>
                                            <div className="text-[8px] text-gray-400 font-bold">VIEWS</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-sm font-bold text-gray-400 italic">No activity data yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid - Premium Glassmorphism */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
                <Link href="/dashboard/admin/orders" className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    <div className="relative bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white shadow-xl shadow-green-900/5 hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-500 flex flex-col h-full border-t-white/80">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-green-500 shadow-lg shadow-green-500/30 rounded-2xl text-white transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-green-600 uppercase bg-green-50 px-2 py-1 rounded-lg">Revenue</span>
                        </div>
                        <div className="mt-auto">
                            <div className="text-2xl font-black text-gray-900 mb-1 tracking-tighter">KES {totalSales.toLocaleString()}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Sales Volume</div>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/admin/orders" className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    <div className="relative bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 flex flex-col h-full border-t-white/80">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-blue-500 shadow-lg shadow-blue-500/30 rounded-2xl text-white transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg">Orders</span>
                        </div>
                        <div className="mt-auto">
                            <div className="text-2xl font-black text-gray-900 mb-1 tracking-tighter">{orders.length.toLocaleString()}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Successful Shipments</div>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/admin/products" className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    <div className="relative bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white shadow-xl shadow-orange-900/5 hover:shadow-2xl hover:shadow-orange-900/10 transition-all duration-500 flex flex-col h-full border-t-white/80">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-orange-500 shadow-lg shadow-orange-500/30 rounded-2xl text-white transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase bg-orange-50 px-2 py-1 rounded-lg">Products</span>
                        </div>
                        <div className="mt-auto">
                            <div className="text-2xl font-black text-gray-900 mb-1 tracking-tighter">{products.length.toLocaleString()}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Items in Catalog</div>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/admin/users" className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    <div className="relative bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white shadow-xl shadow-purple-900/5 hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-500 flex flex-col h-full border-t-white/80">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-purple-500 shadow-lg shadow-purple-500/30 rounded-2xl text-white transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-purple-600 uppercase bg-purple-50 px-2 py-1 rounded-lg">Users</span>
                        </div>
                        <div className="mt-auto">
                            <div className="text-2xl font-black text-gray-900 mb-1 tracking-tighter">{totalUsers.toLocaleString()}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registered Farmers</div>
                        </div>
                    </div>
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
                                        <td className="px-6 py-4 font-medium text-gray-900">#{order.id.slice(0, 8)}</td>
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

                {/* Catalog & Inventory Status */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-900">Catalog & Inventory</h2>
                        <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-1 rounded-md uppercase tracking-wider">Alerts</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {/* Low Stock Alerts */}
                        {products.filter(p => !p.inStock || (p.stockQuantity <= (p.lowStockThreshold || 10))).length > 0 && (
                            <div className="p-4 bg-red-50/30">
                                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-3">Stock Alerts</h3>
                                <div className="space-y-3">
                                    {products.filter(p => !p.inStock || (p.stockQuantity <= (p.lowStockThreshold || 10))).slice(0, 3).map(product => (
                                        <Link href={`/dashboard/admin/products/edit/${product.id}`} key={product.id} className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-900 truncate pr-4">{product.name}</span>
                                            {!product.inStock ?
                                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black uppercase">Empty</span> :
                                                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-black uppercase">{product.stockQuantity} Left</span>
                                            }
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Data Completion Checklist */}
                        <div className="p-4">
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3">Incomplete Listings</h3>
                            <div className="space-y-3">
                                {products.filter(p => !p.brand || !p.specification || !p.howToUse).slice(0, 4).map(product => {
                                    const missing = [];
                                    if (!product.brand) missing.push('Brand');
                                    if (!product.specification) missing.push('Specs');
                                    if (!product.howToUse) missing.push('Guide');

                                    return (
                                        <Link href={`/dashboard/admin/products/edit/${product.id}`} key={product.id} className="block group">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-medium text-gray-900 group-hover:text-melagro-primary transition-colors">{product.name}</span>
                                                <span className="text-[8px] font-black text-gray-300 uppercase italic">Fix Needed</span>
                                            </div>
                                            <div className="flex gap-1">
                                                {missing.map(m => (
                                                    <span key={m} className="text-[8px] border border-gray-100 text-gray-400 px-1 rounded uppercase">{m}</span>
                                                ))}
                                            </div>
                                        </Link>
                                    );
                                })}
                                {products.filter(p => !p.brand || !p.specification || !p.howToUse).length === 0 && (
                                    <div className="text-center py-2">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">All content verified ✓</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                        <Link href="/dashboard/admin/products" className="text-sm text-melagro-primary font-bold hover:underline">Manage Catalog</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
