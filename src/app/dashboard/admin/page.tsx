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
    const [showReport, setShowReport] = useState(false);

    // Analytics State
    const [topSearches, setTopSearches] = useState<SearchTerm[]>([]);
    const [topViewed, setTopViewed] = useState<ViewedProduct[]>([]);
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);

    // Calculate Stats
    const totalSales = orders.reduce((acc: number, order: any) => acc + order.total, 0);
    const totalUsers = users.length;

    const handlePrintReport = () => {
        setShowReport(true);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleSeedProducts = async () => {
        if (!confirm("This will add new products from the mock data to your live store. Continue?")) return;

        setIsSeeding(true);
        const toastId = toast.loading("Seeding new products...");

        try {
            const { products: mockProducts } = await import("@/lib/mockData");
            const productsCollection = collection(db, "products");
            const existingProductsSnap = await getDocs(productsCollection);
            const existingNames = new Set(existingProductsSnap.docs.map(doc => doc.data().name));

            let addedCount = 0;
            const { addDoc } = await import("firebase/firestore");

            for (const p of mockProducts) {
                if (!existingNames.has(p.name)) {
                    const { id, ...rest } = p;
                    await addDoc(productsCollection, rest);
                    addedCount++;
                }
            }

            toast.success(`Successfully added ${addedCount} new products!`, { id: toastId });
        } catch (err) {
            console.error("Seeding error:", err);
            toast.error("Failed to seed products.", { id: toastId });
        } finally {
            setIsSeeding(false);
        }
    };

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
                    <p className="text-gray-500 mt-1">Status: <span className="text-green-600 font-bold">Online</span> • Monitoring Activity</p>
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
                    <button
                        onClick={handleSeedProducts}
                        disabled={isSeeding}
                        className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {isSeeding ? "Seeding..." : "Seed Products"}
                    </button>
                </div>
            </div>

            {/* LIVE INSIGHTS SECTION */}
            <div className="print:hidden">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-melagro-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-melagro-primary"></span>
                    </span>
                    Live Insights
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Searches Widget */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-4 flex justify-between">
                            Top Search Terms
                            <span className="text-xs font-normal text-gray-400">Demand Signals</span>
                        </h3>
                        {loadingAnalytics ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded"></div>)}
                            </div>
                        ) : topSearches.length > 0 ? (
                            <div className="space-y-3">
                                {topSearches.map((term, i) => (
                                    <div key={i} className="flex justify-between items-center group">
                                        <span className="text-gray-900 font-medium capitalize">{term.term}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 bg-gray-100 w-24 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, term.count * 10)}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 w-8 text-right">{term.count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 text-sm">No searches recorded yet.</div>
                        )}
                    </div>

                    {/* Top Viewed Widget */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-4 flex justify-between">
                            Top Viewed Products
                            <span className="text-xs font-normal text-gray-400">Interest</span>
                        </h3>
                        {loadingAnalytics ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded"></div>)}
                            </div>
                        ) : topViewed.length > 0 ? (
                            <div className="space-y-3">
                                {topViewed.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-gray-100 relative overflow-hidden flex-shrink-0">
                                            {item.image && <img src={item.image} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                                        </div>
                                        <div className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">{item.views} views</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 text-sm">No views recorded yet.</div>
                        )}
                    </div>
                </div>
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

                {/* Top Products */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900">Inventory Status</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {products.filter(p => !p.inStock || (p.stockQuantity <= (p.lowStockThreshold || 10))).slice(0, 5).map(product => (
                            <Link href={`/dashboard/admin/products/edit/${product.id}`} key={product.id} className="p-4 block hover:bg-gray-50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-gray-900">{product.name}</span>
                                    {!product.inStock ?
                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Out of Stock</span> :
                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">{product.stockQuantity} Left</span>
                                    }
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                                    <div className={`h-1.5 rounded-full ${!product.inStock ? 'bg-red-500 w-0' : 'bg-yellow-500'}`} style={{ width: product.inStock ? '20%' : '0%' }}></div>
                                </div>
                            </Link>
                        ))}
                        {products.filter(p => !p.inStock || (p.stockQuantity <= (p.lowStockThreshold || 10))).length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-sm">Inventory looks healthy!</div>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                        <Link href="/dashboard/admin/products" className="text-sm text-melagro-primary font-bold hover:underline">Manage Inventory</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
