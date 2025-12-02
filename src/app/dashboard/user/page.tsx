"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useOrders, Order } from "@/context/OrderContext";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useMessages } from "@/context/MessageContext";
import { InvoiceTemplate } from "@/components/documents/InvoiceTemplate";
import { ReceiptTemplate } from "@/components/documents/ReceiptTemplate";
import { DeliveryNoteTemplate } from "@/components/documents/DeliveryNoteTemplate";
import { toast } from "react-hot-toast";

type Tab = 'dashboard' | 'orders' | 'returns' | 'notifications' | 'profile' | 'support';

export default function UserDashboard() {
    const { user, isAuthenticated, isLoading, updateUserProfile, logout } = useAuth();
    const { orders, notifications, markNotificationRead, unreadNotificationsCount, updateOrderStatus, requestReturn } = useOrders();
    const { addToCart } = useCart();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', address: '' });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [printMode, setPrintMode] = useState<'invoice' | 'receipt' | 'delivery' | null>(null);
    const [printOrder, setPrintOrder] = useState<Order | null>(null);

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            router.push('/auth/login');
        } else if (user) {
            setProfileForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || ''
            });
        }
    }, [isAuthenticated, isLoading, router, user]);

    const handleReorder = (order: Order) => {
        order.items.forEach(item => {
            // Construct a product object from the order item
            const product = {
                id: String(item.id),
                name: item.name,
                price: item.price,
                category: 'Reorder', // Fallback
                image: item.image || '',
                rating: 5,
                reviews: 0,
                inStock: true,
                description: ''
            };
            addToCart(product, item.quantity);
        });
        alert('Items added to cart!');
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateUserProfile({
            name: profileForm.name,
            phone: profileForm.phone,
            address: profileForm.address
        });
        setIsEditingProfile(false);
        alert('Profile updated successfully!');
    };

    const handlePrint = (order: Order, type: 'invoice' | 'receipt' | 'delivery') => {
        setPrintOrder(order);
        setPrintMode(type);
    };

    const handleConfirmReceipt = async (orderId: string) => {
        if (confirm("Are you sure you have received this order?")) {
            try {
                await updateOrderStatus(orderId, 'Delivered');
                toast.success("Order marked as Delivered");
            } catch (error) {
                console.error("Error updating order:", error);
                toast.error("Failed to update order status");
            }
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
                setSelectedOrder(null); // Close modal to refresh or just let it update via context
            } catch (error) {
                console.error("Error requesting return:", error);
                toast.error("Failed to request return");
            }
        }
    };

    if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div></div>;

    const stats = {
        totalOrders: orders.length,
        activeOrders: orders.filter(o => o.status === 'Processing' || o.status === 'Shipped').length,
        totalSpent: orders.reduce((acc, curr) => acc + curr.total, 0)
    };

    const renderSidebar = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-melagro-primary/10 rounded-full flex items-center justify-center text-melagro-primary font-bold text-xl">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="font-bold text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                </div>
            </div>

            <nav className="space-y-2">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
                    { id: 'orders', label: 'My Orders', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg> },
                    { id: 'returns', label: 'Returns & Refunds', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> },
                    {
                        id: 'notifications', label: 'Notifications', icon: (
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                {unreadNotificationsCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                            </div>
                        )
                    },
                    { id: 'profile', label: 'Profile Settings', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
                    { id: 'support', label: 'Support', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as Tab)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                            ? 'bg-melagro-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {item.icon}
                        {item.label}
                        {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'notifications' ? 'bg-white text-melagro-primary' : 'bg-melagro-primary text-white'}`}>
                                {unreadNotificationsCount}
                            </span>
                        )}
                    </button>
                ))}

                <div className="pt-4 mt-4 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Sign Out
                    </button>
                </div>
            </nav>
        </div>
    );

    const [trackOrderId, setTrackOrderId] = useState('');

    const handleTrackOrder = (e: React.FormEvent) => {
        e.preventDefault();
        const order = orders.find(o => o.id.toLowerCase() === trackOrderId.toLowerCase() || o.id.toLowerCase().includes(trackOrderId.toLowerCase()));
        if (order) {
            setSelectedOrder(order);
            setTrackOrderId('');
        } else {
            alert('Order not found. Please check the Order ID.');
        }
    };

    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm mb-1">Total Orders</div>
                    <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm mb-1">Active Orders</div>
                    <div className="text-3xl font-bold text-melagro-primary">{stats.activeOrders}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm mb-1">Total Spent</div>
                    <div className="text-3xl font-bold text-gray-900">KES {stats.totalSpent.toLocaleString()}</div>
                </div>
            </div>

            {/* Track Order Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Track Order</h2>
                <form onSubmit={handleTrackOrder} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Enter Order ID (e.g., #12345)"
                        value={trackOrderId}
                        onChange={(e) => setTrackOrderId(e.target.value)}
                        className="flex-grow px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-melagro-primary/20"
                    />
                    <button type="submit" className="bg-melagro-primary text-white px-6 py-2 rounded-xl font-medium hover:bg-melagro-secondary transition-colors">
                        Track
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Recent Orders</h2>
                {orders.slice(0, 3).map(order => (
                    <div key={order.id} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                        <div>
                            <div className="font-medium text-gray-900">Order #{order.id}</div>
                            <div className="text-sm text-gray-500">{order.date}</div>
                        </div>
                        <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold mb-1 ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                {order.status}
                            </span>
                            <div className="font-bold text-sm">KES {order.total.toLocaleString()}</div>
                        </div>
                    </div>
                ))}
                <button onClick={() => setActiveTab('orders')} className="w-full mt-4 text-center text-melagro-primary font-medium text-sm hover:underline">
                    View All Orders
                </button>
            </div>
        </div>
    );

    const renderReturns = () => {
        const returnedOrders = orders.filter(o => o.returnStatus);

        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Returns & Refunds</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {returnedOrders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <p>No return requests found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {returnedOrders.map((order) => (
                                <div key={order.id} className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">Order #{order.id}</h3>
                                            <p className="text-sm text-gray-500">Requested on {order.date}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.returnStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                                                order.returnStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {order.returnStatus}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                        <p className="text-sm font-medium text-gray-700">Reason:</p>
                                        <p className="text-sm text-gray-600">{order.returnReason}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="text-sm text-melagro-primary font-medium hover:underline"
                                    >
                                        View Order Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderOrders = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                    {orders.map((order) => (
                        <div key={order.id} className="p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold text-lg text-gray-900">Order #{order.id}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                            order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">Placed on {order.date}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                        Track Order
                                    </button>
                                    <button
                                        onClick={() => handleReorder(order)}
                                        className="px-4 py-2 bg-melagro-primary text-white rounded-lg text-sm font-medium hover:bg-melagro-secondary transition-colors"
                                    >
                                        Buy Again
                                    </button>
                                    {order.status === 'Shipped' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleConfirmReceipt(order.id);
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                        >
                                            Confirm Receipt
                                        </button>
                                    )}
                                    {order.status === 'Processing' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCancelOrder(order.id);
                                            }}
                                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {order.items.map((item, i) => (
                                    <div key={i} className="flex-shrink-0 w-20">
                                        <div className="aspect-square bg-gray-100 rounded-lg relative overflow-hidden mb-2">
                                            {item.image ? (
                                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600 truncate">{item.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderNotifications = () => (
        <div className="max-w-2xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                {unreadNotificationsCount > 0 && (
                    <button
                        onClick={() => notifications.forEach(n => markNotificationRead(n.id))}
                        className="text-sm text-melagro-primary hover:underline font-medium"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                onClick={() => markNotificationRead(notification.id)}
                            >
                                <div className="flex gap-4">
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-melagro-primary' : 'bg-transparent'}`}></div>
                                    <div className="flex-grow">
                                        <p className={`text-sm ${!notification.read ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">{notification.date}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderProfile = () => (
        <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input
                                type="text"
                                value={profileForm.name}
                                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                disabled={!isEditingProfile}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagro-primary/20 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={profileForm.email}
                                disabled
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                disabled={!isEditingProfile}
                                placeholder="+254..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagro-primary/20 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Delivery Address</label>
                            <input
                                type="text"
                                value={profileForm.address}
                                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                                disabled={!isEditingProfile}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagro-primary/20 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        {isEditingProfile ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingProfile(false)}
                                    className="px-6 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-melagro-primary text-white rounded-lg text-sm font-medium hover:bg-melagro-secondary"
                                >
                                    Save Changes
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditingProfile(true)}
                                className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );

    const renderSupport = () => (
        <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Support</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <a href="https://wa.me/254748970757" target="_blank" className="bg-green-50 p-6 rounded-2xl border border-green-100 hover:shadow-md transition-all flex flex-col items-center text-center group">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                    </div>
                    <h3 className="font-bold text-gray-900">Chat on WhatsApp</h3>
                    <p className="text-sm text-gray-500 mt-1">Instant response</p>
                </a>
                <a href="mailto:support@melagro.com" className="bg-blue-50 p-6 rounded-2xl border border-blue-100 hover:shadow-md transition-all flex flex-col items-center text-center group">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="font-bold text-gray-900">Email Support</h3>
                    <p className="text-sm text-gray-500 mt-1">Response within 24h</p>
                </a>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 className="font-bold text-gray-900 mb-4">Send us a message</h3>
                <MessageForm />
            </div>
        </div>
    );


    const OrderTimeline = ({ status }: { status: string }) => {
        const steps = ['Processing', 'Shipped', 'Delivered'];
        const currentStepIndex = steps.indexOf(status);
        // Handle Cancelled or unknown status
        if (currentStepIndex === -1 && status !== 'Cancelled') return null;
        if (status === 'Cancelled') return <div className="text-red-600 font-bold bg-red-50 p-3 rounded-lg text-center">Order Cancelled</div>;

        return (
            <div className="w-full py-4">
                <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-green-500 -z-10 transition-all duration-500"
                        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                    ></div>

                    {steps.map((step, index) => (
                        <div key={step} className="flex flex-col items-center bg-white px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${index <= currentStepIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                {index < currentStepIndex ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <span className={`mt-2 text-xs font-bold ${index <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'}`}>
                                {step}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            {/* Print Overlay */}
            {printMode && printOrder && (
                <div className="fixed inset-0 z-[100] bg-white overflow-auto print:overflow-visible">
                    <div className="p-4 print:hidden flex justify-between items-center bg-gray-900 text-white sticky top-0 z-50">
                        <div className="font-bold">View: {printMode.toUpperCase()}</div>
                        <div className="flex gap-4">
                            <button onClick={() => window.print()} className="bg-melagro-primary px-4 py-2 rounded-lg hover:bg-melagro-secondary flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print
                            </button>
                            <button onClick={() => { setPrintMode(null); setPrintOrder(null); }} className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600">Close</button>
                        </div>
                    </div>
                    <div className="p-4 md:p-8 print:p-0 max-w-4xl mx-auto">
                        {printMode === 'invoice' && <InvoiceTemplate order={printOrder} />}
                        {printMode === 'receipt' && <ReceiptTemplate order={printOrder} />}
                        {printMode === 'delivery' && <DeliveryNoteTemplate order={printOrder} />}
                    </div>
                </div>
            )}

            <div className="print:hidden">
                <Header />

                <main className="flex-grow py-8 lg:py-12">
                    <div className="container-custom">
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Sidebar */}
                            <div className="lg:w-1/4">
                                {renderSidebar()}
                            </div>

                            {/* Main Content */}
                            <div className="lg:w-3/4">
                                {activeTab === 'dashboard' && renderDashboard()}
                                {activeTab === 'orders' && renderOrders()}
                                {activeTab === 'returns' && renderReturns()}
                                {activeTab === 'notifications' && renderNotifications()}
                                {activeTab === 'profile' && renderProfile()}
                                {activeTab === 'support' && renderSupport()}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Order Details Modal */}
                {selectedOrder && !printMode && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
                        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">Order #{selectedOrder.id}</h2>
                                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Order Timeline */}
                            <div className="mb-8 px-2">
                                <OrderTimeline status={selectedOrder.status} />
                            </div>

                            <div className="space-y-4">
                                {selectedOrder.items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-4">
                                        <div>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                                        </div>
                                        <div className="font-bold">KES {(item.price * item.quantity).toLocaleString()}</div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-4 font-bold text-lg">
                                    <span>Total</span>
                                    <span>KES {selectedOrder.total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                {selectedOrder.status === 'Shipped' && (
                                    <button
                                        onClick={() => handleConfirmReceipt(selectedOrder.id)}
                                        className="col-span-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
                                    >
                                        Confirm Receipt of Goods
                                    </button>
                                )}
                                {selectedOrder.status === 'Processing' && (
                                    <button
                                        onClick={() => handleCancelOrder(selectedOrder.id)}
                                        className="col-span-2 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
                                    >
                                        Cancel Order
                                    </button>
                                )}
                                <button onClick={() => handleReorder(selectedOrder)} className="col-span-2 btn-primary w-full">Buy Again</button>

                                {/* Invoice - Always Available */}
                                <button onClick={() => handlePrint(selectedOrder, 'invoice')} className="btn-secondary flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    View Invoice
                                </button>

                                {/* Receipt - Only if Paid */}
                                {(selectedOrder.paymentStatus === 'Paid' || selectedOrder.status === 'Delivered') && (
                                    <button onClick={() => handlePrint(selectedOrder, 'receipt')} className="btn-secondary flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        View Receipt
                                    </button>
                                )}

                                {/* Delivery Note - Only if Delivered */}
                                {selectedOrder.status === 'Delivered' && (
                                    <button onClick={() => handlePrint(selectedOrder, 'delivery')} className="col-span-2 btn-secondary flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        View Delivery Note
                                    </button>
                                )}

                                {/* Return Button */}
                                {selectedOrder.status === 'Delivered' && !selectedOrder.returnStatus && (
                                    <button
                                        onClick={() => handleRequestReturn(selectedOrder.id)}
                                        className="col-span-2 bg-orange-50 text-orange-600 py-3 rounded-xl font-bold hover:bg-orange-100 transition-colors"
                                    >
                                        Request Return / Refund
                                    </button>
                                )}

                                {/* Return Status Badge */}
                                {selectedOrder.returnStatus && (
                                    <div className={`col-span-2 p-4 rounded-xl text-center font-bold ${selectedOrder.returnStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                                        selectedOrder.returnStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        Return Status: {selectedOrder.returnStatus}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <Footer />
            </div>
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
            await sendMessage(subject, message);
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagro-primary/20"
                >
                    <option>Order Inquiry</option>
                    <option>Product Question</option>
                    <option>Technical Support</option>
                    <option>Other</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagro-primary/20"
                    placeholder="How can we help you?"
                    required
                ></textarea>
            </div>
            <button
                type="submit"
                disabled={status === 'sending' || status === 'success'}
                className={`btn-primary w-full ${status === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
                {status === 'sending' ? 'Sending...' : status === 'success' ? 'Message Sent!' : 'Send Message'}
            </button>
            {status === 'error' && <p className="text-red-500 text-sm text-center">Failed to send message. Please try again.</p>}
        </form>
    );
}
