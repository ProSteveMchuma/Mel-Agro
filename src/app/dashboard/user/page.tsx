"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useOrders, Order, OrderItem, Notification } from "@/context/OrderContext";
import { useCart } from "@/context/CartContext";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useMessages } from "@/context/MessageContext";
import { useWishlist } from "@/context/WishlistContext";
import { InvoiceTemplate } from "@/components/documents/InvoiceTemplate";
import { ReceiptTemplate } from "@/components/documents/ReceiptTemplate";
import { DeliveryNoteTemplate } from "@/components/documents/DeliveryNoteTemplate";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import { toast } from "react-hot-toast";
import AddressBook from "@/components/dashboard/AddressBook";

type Tab = 'dashboard' | 'orders' | 'returns' | 'notifications' | 'profile' | 'support' | 'wishlist' | 'addresses' | 'payments';

export default function UserDashboard() {
    const { user, isLoading, logout, updateProfile } = useAuth();
    const { orders, updateOrderStatus, requestReturn, handleConfirmReceipt } = useOrders();
    const { addToCart } = useCart();
    const { notifications, markNotificationRead, unreadNotificationsCount } = useOrders();
    const { wishlist, removeFromWishlist } = useWishlist();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || ''
    });
    const [printMode, setPrintMode] = useState<'invoice' | 'receipt' | 'delivery' | null>(null);
    const [printOrder, setPrintOrder] = useState<Order | null>(null);
    const [trackOrderId, setTrackOrderId] = useState('');

    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || ''
            });
        }
    }, [user]);

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProfile(profileForm);
            setIsEditingProfile(false);
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update profile");
        }
    };

    const handleReorder = async (order: Order) => {
        try {
            for (const item of order.items) {
                await addToCart({
                    id: String(item.id),
                    name: item.name,
                    price: item.price,
                    image: item.image || '',
                    category: 'Reorder',
                    rating: 5,
                    reviews: 0,
                    inStock: true,
                    description: '',
                    stockQuantity: 100,
                    lowStockThreshold: 10
                }, item.quantity);
            }
            toast.success("All items added to cart!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to reorder items");
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
            try {
                await updateOrderStatus(orderId, 'Cancelled');
                toast.success("Order cancelled successfully");
            } catch (error) {
                console.error("Error cancelling order:", error);
                toast.error("Failed to cancel order");
            }
        }
    };

    const handleRequestReturn = async (orderId: string) => {
        const reason = prompt("Please enter the reason for your return:");
        if (reason) {
            try {
                await requestReturn(orderId, reason);
                toast.success("Return requested successfully");
                setSelectedOrder(null);
            } catch (error) {
                console.error("Error requesting return:", error);
                toast.error("Failed to request return");
            }
        }
    };

    if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagri-primary"></div></div>;

    const statsData = [
        { label: "Total Orders", value: orders.length.toString(), icon: "📦", color: "bg-blue-50 text-blue-600" },
        { label: "Loyalty Points", value: (user?.loyaltyPoints || 0).toString(), icon: "⭐", color: "bg-purple-50 text-purple-600" },
        { label: "Total Spent", value: `KES ${orders.reduce((acc: number, curr: Order) => acc + curr.total, 0).toLocaleString()}`, icon: "💰", color: "bg-green-50 text-green-600" }
    ];

    const handleTrackOrder = (e: React.FormEvent) => {
        e.preventDefault();
        const order = orders.find(o => o.id.toLowerCase() === trackOrderId.toLowerCase() || o.id.toLowerCase().includes(trackOrderId.toLowerCase()));
        if (order) {
            setSelectedOrder(order);
            setTrackOrderId('');
        } else {
            toast.error('Order not found. Please check the Order ID.');
        }
    };

    const renderDashboard = () => (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Jambo, {user.name?.split(' ')[0]}! 👋</h1>
                <p className="text-gray-600">Here's what's happening with your farm inputs today.</p>
            </div>

            {/* Active Order Progress - Difference Maker */}
            {orders.filter(o => o.status === 'Processing' || o.status === 'Shipped').slice(0, 1).map(activeOrder => (
                <div key={activeOrder.id} className="bg-white rounded-3xl p-8 border border-melagri-primary/20 shadow-xl shadow-melagri-primary/5 animate-in slide-in-from-bottom-4 duration-700">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-melagri-primary mb-1">Active Tracking</h3>
                            <p className="text-xl font-black text-gray-900 leading-none">Order #{activeOrder.id.slice(0, 8)}</p>
                        </div>
                        <Link href="/dashboard/user" onClick={() => { setSelectedOrder(activeOrder); }} className="text-xs font-bold bg-gray-900 text-white px-4 py-2 rounded-xl hover:scale-105 transition-all">Full Tracking</Link>
                    </div>
                    <OrderTimeline status={activeOrder.status} />
                </div>
            ))}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {statsData.map((stat, idx) => (
                    <div key={idx} className={`${stat.color} rounded-3xl p-8 border border-white shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-500`}>
                        <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform">{stat.icon}</div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                        <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-gradient-to-r from-green-600 to-melagri-primary rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl shadow-green-900/10">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform scale-150 rotate-12">🚜</div>
                <div className="relative z-10 max-w-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Farmer's Pro-Tip</span>
                    </div>
                    <h3 className="text-2xl font-black mb-3 leading-tight">Maximized Maize Yields 🌽</h3>
                    <p className="text-white/80 text-sm font-medium leading-relaxed">
                        Top-dressing with CAN when your maize reaches knee-height (4-6 weeks after planting) can specifically target grain development and increase your harvest by up to 30%.
                    </p>
                    <button onClick={() => router.push('/products')} className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white text-green-700 px-6 py-3 rounded-xl hover:bg-green-50 transition-all">
                        View Relevant Inputs
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </div>
            </div>

            {/* Loyalty & Rewards Card */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl shadow-purple-900/20 group">
                <div className="absolute -right-10 -bottom-10 p-20 opacity-10 transform scale-150 group-hover:rotate-12 transition-transform duration-700">⭐</div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Mel-Agri Rewards</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div>
                            <h3 className="text-4xl font-black mb-2 leading-tight">{user.loyaltyPoints || 0} Points</h3>
                            <p className="text-white/80 text-sm font-medium max-w-md">
                                You've earned points on every purchase! Redeem them for discounts on fertilizers, seeds, and equipment during your next checkout.
                            </p>
                        </div>
                        <Link href="/products" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white text-purple-700 px-6 py-3 rounded-xl hover:bg-purple-50 transition-all w-fit">
                            Redeem Points
                        </Link>
                    </div>
                    {/* Points Progress */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Next Tier Progress</p>
                            <p className="text-xs font-bold">{Math.min(100, Math.floor(((user.loyaltyPoints || 0) % 500) / 5))}%</p>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, Math.floor(((user.loyaltyPoints || 0) % 500) / 5))}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/products" className="p-4 bg-melagri-primary text-white rounded-2xl flex flex-col items-center gap-2 hover:scale-[1.05] transition-all group shadow-lg shadow-melagri-primary/20">
                            <span className="text-2xl">🚜</span>
                            <span className="text-xs font-bold uppercase">Shop Now</span>
                        </Link>
                        <button onClick={() => setActiveTab('wishlist')} className="p-4 bg-red-500 text-white rounded-2xl flex flex-col items-center gap-2 hover:scale-[1.05] transition-all shadow-lg shadow-red-500/20">
                            <span className="text-2xl">❤️</span>
                            <span className="text-xs font-bold uppercase">Wishlist</span>
                        </button>
                        <button onClick={() => setActiveTab('support')} className="p-4 bg-blue-500 text-white rounded-2xl flex flex-col items-center gap-2 hover:scale-[1.05] transition-all shadow-lg shadow-blue-500/20">
                            <span className="text-2xl">🎧</span>
                            <span className="text-xs font-bold uppercase">Support</span>
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900">Recent Orders</h3>
                        <button onClick={() => setActiveTab('orders')} className="text-melagri-primary hover:underline text-sm font-semibold">View All</button>
                    </div>
                    {orders.length > 0 ? (
                        <div className="space-y-3">
                            {orders.slice(0, 3).map((order: Order) => (
                                <div key={order.id} onClick={() => { setSelectedOrder(order); }} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-melagri-primary/10">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">#{order.id.slice(0, 8)}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">{new Date(order.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <p className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                                {order.paymentStatus || 'Unpaid'}
                                            </p>
                                            <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{order.status}</p>
                                        </div>
                                        <p className="text-sm font-bold text-melagri-primary mt-1">KES {order.total.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl">
                            <p className="text-gray-400 text-sm">No orders yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Reorder Widget */}
            {orders.length > 0 && (
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6">Frequently Ordered Items</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {Array.from(new Map(orders.flatMap(o => o.items).map(item => [item.id, item])).values())
                            .slice(0, 6)
                            .map((item: any, i: number) => (
                                <div key={i} className="group cursor-pointer" onClick={() => addToCart({
                                    id: String(item.id),
                                    name: item.name,
                                    price: item.price,
                                    image: item.image || '',
                                    category: 'Reorder',
                                    rating: 5,
                                    reviews: 0,
                                    inStock: true,
                                    description: '',
                                    stockQuantity: 100,
                                    lowStockThreshold: 10
                                }, 1)}>
                                    <div className="aspect-square bg-gray-50 rounded-xl relative overflow-hidden mb-2 border border-gray-100 group-hover:border-melagri-primary transition-colors">
                                        {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <span className="text-white text-xs font-bold bg-melagri-primary px-3 py-1 rounded-full">+ Add</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-800 truncate">{item.name}</p>
                                    <p className="text-[10px] text-melagri-primary font-bold">KES {item.price.toLocaleString()}</p>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderOrders = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
            {orders.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
                    <p className="text-gray-500 mb-6">No orders found.</p>
                    <Link href="/products" className="btn-primary">Browse Products</Link>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="divide-y divide-gray-50">
                        {orders.map((order: Order) => (
                            <div key={order.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-lg text-gray-900">Order #{order.id.slice(0, 8)}</h3>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {order.status}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                                {order.paymentStatus || 'Unpaid'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium tracking-tight">Placed on {new Date(order.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setSelectedOrder(order)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-melagri-primary transition-colors">Details</button>
                                        <button onClick={() => handleReorder(order)} className="px-4 py-2 bg-melagri-primary text-white text-xs font-bold rounded-lg hover:bg-melagri-secondary transition-all">Reorder</button>
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {order.items.map((item: any, i: number) => (
                                        <div key={i} className="flex-shrink-0 w-20">
                                            <div className="aspect-square bg-gray-50 rounded-xl relative overflow-hidden mb-1 border border-gray-100">
                                                {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-800 truncate">{item.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );


    const renderReturns = () => {
        const returnedOrders = orders.filter((o: Order) => o.status === 'Cancelled' || o.returnStatus);
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Returns & Refunds</h2>
                {returnedOrders.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
                        <div className="grow text-5xl mb-4">🔄</div>
                        <p className="text-gray-500 font-medium">No return requests found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {returnedOrders.map((order: Order) => (
                            <div key={order.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <p className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                                        <p className="text-xs text-gray-400">{new Date(order.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${order.returnStatus === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {order.returnStatus || 'Processing'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">Reason: {order.returnReason || 'N/A'}</p>
                                <button onClick={() => setSelectedOrder(order)} className="text-melagri-primary text-sm font-bold hover:underline">View Details</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderNotifications = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                {unreadNotificationsCount > 0 && (
                    <button onClick={() => notifications.forEach((n: Notification) => markNotificationRead(n.id))} className="text-sm font-bold text-melagri-primary hover:underline">Mark all as read</button>
                )}
            </div>
            {notifications.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
                    <div className="text-5xl mb-4">🔔</div>
                    <p className="text-gray-500 font-medium">No new notifications.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="divide-y divide-gray-50">
                        {notifications.map((n: Notification) => (
                            <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`p-6 flex gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-melagri-primary' : 'bg-transparent'}`}></div>
                                <div>
                                    <p className={`text-sm ${!n.read ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{n.message}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.date).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderWishlist = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Wishlist</h2>
            {wishlist.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
                    <div className="text-5xl mb-4">❤️</div>
                    <p className="text-gray-500 font-medium">Your wishlist is empty.</p>
                    <Link href="/products" className="btn-primary mt-6 inline-block">Start Shopping</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlist.map((product) => (
                        <div key={product.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm group hover:shadow-xl transition-all">
                            <div className="aspect-square relative rounded-xl overflow-hidden mb-4 bg-gray-50">
                                <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                                <button onClick={() => removeFromWishlist(product.id)} className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-md rounded-full text-red-500 hover:bg-red-50 transition-colors">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" /></svg>
                                </button>
                            </div>
                            <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                            <p className="text-melagri-primary font-black mb-4">KES {product.price.toLocaleString()}</p>
                            <button onClick={() => addToCart(product, 1)} className="w-full py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all">Add to Cart</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const OrderTimeline = ({ status }: { status: string }) => {
        const steps = ['Processing', 'Shipped', 'Delivered'];
        const currentStepIndex = steps.indexOf(status);
        if (currentStepIndex === -1 && status !== 'Cancelled') return null;
        if (status === 'Cancelled') return <div className="text-red-600 font-bold bg-red-50 p-4 rounded-2xl text-center border border-red-100 mb-6">Order Cancelled</div>;

        return (
            <div className="w-full py-8">
                <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-100 -z-10 rounded-full"></div>
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-melagri-primary -z-10 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                    ></div>

                    {steps.map((step, index) => (
                        <div key={step} className="flex flex-col items-center bg-transparent px-2 group">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-lg ${index <= currentStepIndex ? 'bg-melagri-primary text-white scale-110 shadow-melagri-primary/30' : 'bg-white text-gray-400 border-2 border-gray-100'
                                }`}>
                                {index < currentStepIndex ? (
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <span className={`mt-3 text-[10px] font-black uppercase tracking-wider ${index <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'}`}>
                                {step}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderSupport = () => (
        <div className="max-w-2xl space-y-8">
            <h2 className="text-2xl font-bold text-gray-900">Customer Support</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="https://wa.me/254748970757" target="_blank" className="p-6 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.038 3.284l-.54 1.964 2.009-.528c.954.524 1.942.85 3.037.852 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.772-5.744-5.772zm3.374 8.086c-.1.272-.58.513-.801.551-.237.042-.46.079-.769-.015-.297-.091-.676-.239-1.144-.442-1.99-.861-3.284-2.885-3.383-3.018-.099-.134-.736-.979-.736-1.959 0-.979.512-1.46.694-1.658.183-.198.396-.247.53-.247.13 0 .26.012.37.012.11 0 .26-.041.408.321.148.36.512 1.25.56 1.348.049.099.083.214.016.347-.066.13-.1.214-.2.33-.1.115-.208.261-.297.35-.099.099-.198.198-.083.396.115.198.512.845 1.099 1.366.759.673 1.398.882 1.596.981.198.099.313.082.43-.049.115-.132.512-.596.644-.793.132-.198.26-.165.43-.099.172.066 1.09.514 1.277.613.183.1.312.148.363.23.049.082.049.479-.05.751z" /></svg>
                    </div>
                    <div>
                        <p className="font-bold text-gray-900">WhatsApp</p>
                        <p className="text-[10px] text-gray-400">Fastest response</p>
                    </div>
                </a>
                <a href="mailto:support@Mel-Agri.com" className="p-6 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                        <p className="font-bold text-gray-900">Email Support</p>
                        <p className="text-[10px] text-gray-400">Official inquiries</p>
                    </div>
                </a>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-6">Send us a message</h3>
                <MessageForm />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#F9FAFB] font-sans">
            <Header />
            <main className="flex-grow py-12 px-4 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 sticky top-24 shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 bg-gradient-to-tr from-melagri-primary to-green-400 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-melagri-primary/10">
                                    {user.name?.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-bold text-gray-900 truncate leading-tight">{user.name}</p>
                                    <p className="text-[10px] text-gray-400 font-medium truncate">{user.email}</p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <WeatherWidget />
                            </div>

                            <nav className="space-y-1.5">
                                {[
                                    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
                                    { id: 'orders', label: 'My Orders', icon: '📦' },
                                    { id: 'wishlist', label: 'Wishlist', icon: '❤️' },
                                    { id: 'addresses', label: 'Addresses', icon: '📍' },
                                    { id: 'returns', label: 'Returns', icon: '🔄' },
                                    { id: 'notifications', label: 'Alerts', icon: '🔔' },
                                    { id: 'profile', label: 'Settings', icon: '⚙️' },
                                    { id: 'support', label: 'Support', icon: '🎧' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id as Tab)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === item.id
                                            ? 'bg-melagri-primary text-white shadow-[0_10px_20px_-5px_rgba(34,197,94,0.4)] translate-x-1'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-melagri-primary hover:translate-x-1'
                                            }`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        {item.label}
                                        {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                                            <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                                        )}
                                    </button>
                                ))}
                                <div className="pt-4 mt-6 border-t border-gray-50">
                                    <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                                        <span className="text-lg">🚪</span> Sign Out
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3">
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'orders' && renderOrders()}
                        {activeTab === 'wishlist' && renderWishlist()}
                        {activeTab === 'notifications' && renderNotifications()}
                        {activeTab === 'returns' && renderReturns()}
                        {activeTab === 'addresses' && <AddressBook />}
                        {activeTab === 'support' && renderSupport()}
                        {activeTab === 'profile' && (
                            <div className="max-w-2xl bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                                <h2 className="text-2xl font-bold text-gray-900 mb-8">Profile Settings</h2>
                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Full Name</label>
                                            <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} disabled={!isEditingProfile} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-melagri-primary/20 disabled:opacity-50 font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Email Address</label>
                                            <input type="email" value={profileForm.email} disabled className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl font-medium opacity-50 cursor-not-allowed" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Phone</label>
                                            <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} disabled={!isEditingProfile} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Delivery Address</label>
                                            <input type="text" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} disabled={!isEditingProfile} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl font-medium" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        {isEditingProfile ? (
                                            <div className="flex gap-3">
                                                <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-3 font-bold text-gray-500">Cancel</button>
                                                <button type="submit" className="px-8 py-3 bg-melagri-primary text-white rounded-2xl font-bold shadow-lg shadow-melagri-primary/20 hover:scale-105 transition-all">Save Changes</button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => setIsEditingProfile(true)} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:scale-105 transition-all">Edit Profile</button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )}
                        {/* Fallback for other tabs if not implemented yet */}
                        {!['dashboard', 'orders', 'support', 'profile', 'wishlist', 'notifications', 'returns'].includes(activeTab) && (
                            <div className="bg-white p-20 rounded-3xl border border-gray-100 text-center shadow-sm">
                                <div className="text-6xl mb-6">🛠️</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Coming Soon</h3>
                                <p className="text-gray-500 font-medium">We're working hard to bring you this feature.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals & Overlays */}
                {selectedOrder && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedOrder(null)}>
                        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <h2 className="text-2xl font-black text-gray-900 mb-6">Order Details</h2>
                            <OrderTimeline status={selectedOrder.status} />
                            <div className="flex gap-4 mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                                    <p className="font-black text-melagri-primary uppercase">{selectedOrder.status}</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total Amount</p>
                                    <p className="font-black text-gray-900">KES {selectedOrder.total.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="space-y-4 mb-8">
                                {selectedOrder.items.map((item: any, i: number) => (
                                    <div key={i} className="flex gap-4 items-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0">
                                            {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.quantity} x KES {item.price.toLocaleString()}</p>
                                        </div>
                                        <p className="font-bold text-gray-900">KES {(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => { setPrintOrder(selectedOrder); setPrintMode('invoice'); }} className="py-3 px-4 bg-gray-900 text-white rounded-xl text-xs font-bold hover:scale-[1.02] transition-all">Invoice</button>
                                <button onClick={() => { setPrintOrder(selectedOrder); setPrintMode('receipt'); }} className="py-3 px-4 bg-gray-900 text-white rounded-xl text-xs font-bold hover:scale-[1.02] transition-all">Receipt</button>
                                <button onClick={() => { setPrintOrder(selectedOrder); setPrintMode('delivery'); }} className="py-3 px-4 bg-gray-900 text-white rounded-xl text-xs font-bold hover:scale-[1.02] transition-all">Ship Doc</button>
                            </div>
                        </div>
                    </div>
                )}

                {printMode && printOrder && (
                    <div className="fixed inset-0 z-[100] bg-white overflow-auto print:p-0">
                        <div className="p-4 print:hidden flex justify-between items-center bg-gray-900 text-white sticky top-0 z-50">
                            <span className="font-bold">Preview: {printMode.toUpperCase()}</span>
                            <div className="flex gap-2">
                                <button onClick={() => window.print()} className="bg-melagri-primary px-6 py-2 rounded-xl text-sm font-bold hover:bg-melagri-secondary transition-all">Print Document</button>
                                <button onClick={() => { setPrintMode(null); setPrintOrder(null); }} className="bg-gray-700 px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-600 transition-all">Close</button>
                            </div>
                        </div>
                        <div className="p-8 max-w-4xl mx-auto">
                            {printMode === 'invoice' && <InvoiceTemplate order={printOrder} />}
                            {printMode === 'receipt' && <ReceiptTemplate order={printOrder} />}
                            {printMode === 'delivery' && <DeliveryNoteTemplate order={printOrder} />}
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}

function MessageForm() {
    const { sendMessage } = useMessages();
    const [subject, setSubject] = useState('Order Inquiry');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setStatus('sending');
        try {
            await sendMessage(`${subject}: ${message}`, 'text');
            setStatus('success');
            setMessage('');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Subject</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-melagri-primary/20">
                    <option>Order Inquiry</option>
                    <option>Product Question</option>
                    <option>Technical Support</option>
                    <option>Other</option>
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Message</label>
                <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-melagri-primary/20" placeholder="How can we help you?" required></textarea>
            </div>
            <button type="submit" disabled={status === 'sending' || status === 'success'} className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${status === 'success' ? 'bg-green-500' : 'bg-melagri-primary hover:scale-[1.02]'}`}>
                {status === 'sending' ? 'Sending...' : status === 'success' ? 'Message Sent!' : 'Send Message'}
            </button>
        </form>
    );
}
