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
import { useChama, ChamaGroup } from "@/context/ChamaContext";
import { InvoiceTemplate } from "@/components/documents/InvoiceTemplate";
import { ReceiptTemplate } from "@/components/documents/ReceiptTemplate";
import { DeliveryNoteTemplate } from "@/components/documents/DeliveryNoteTemplate";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import { toast } from "react-hot-toast";

type Tab = 'dashboard' | 'orders' | 'returns' | 'notifications' | 'profile' | 'support' | 'chamas' | 'wishlist' | 'addresses' | 'payments';

export default function UserDashboard() {
    const { user, isLoading, logout, updateProfile } = useAuth();
    const { orders, updateOrderStatus, requestReturn, handleConfirmReceipt } = useOrders();
    const { addToCart } = useCart();
    const { notifications, markNotificationRead, unreadNotificationsCount } = useOrders();
    const { activeChamas } = useChama();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || ''
    });

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

    if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div></div>;

    const statsData = [
        { label: "Total Orders", value: orders.length.toString(), icon: "📦", color: "bg-blue-50 text-blue-600" },
        { label: "Active Orders", value: orders.filter((o: Order) => o.status === 'Processing' || o.status === 'Shipped').length.toString(), icon: "🕒", color: "bg-yellow-50 text-yellow-600" },
        { label: "Total Spent", value: `KES ${orders.reduce((acc: number, curr: Order) => acc + curr.total, 0).toLocaleString()}`, icon: "💰", color: "bg-green-50 text-green-600" }
    ];

    const renderDashboard = () => (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Jambo, {user.name?.split(' ')[0]}! 👋</h1>
                <p className="text-gray-600">Here's what's happening with your farm inputs today.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {statsData.map((stat, idx) => (
                    <div key={idx} className={`${stat.color} rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all`}>
                        <div className="text-3xl mb-3">{stat.icon}</div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link href="/products" className="w-full bg-melagro-primary hover:bg-melagro-secondary text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-between group shadow-lg shadow-melagro-primary/20">
                            + New Order
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                        <button onClick={() => setActiveTab('profile')} className="w-full border-2 border-gray-100 text-gray-900 px-4 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-between group">
                            Update Profile
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900">Recent Orders</h3>
                        <button onClick={() => setActiveTab('orders')} className="text-melagro-primary hover:underline text-sm font-semibold">View All</button>
                    </div>
                    {orders.length > 0 ? (
                        <div className="space-y-3">
                            {orders.slice(0, 3).map((order: Order) => (
                                <div key={order.id} onClick={() => { setSelectedOrder(order); setActiveTab('orders'); }} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-melagro-primary/10">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">#{order.id.slice(0, 8)}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">{new Date(order.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{order.status}</p>
                                        <p className="text-sm font-bold text-melagro-primary">KES {order.total.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-sm">No orders yet</div>
                    )}
                </div>
            </div>
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
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium tracking-tight">Placed on {new Date(order.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setSelectedOrder(order)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-melagro-primary transition-colors">Details</button>
                                        <button onClick={() => handleReorder(order)} className="px-4 py-2 bg-melagro-primary text-white text-xs font-bold rounded-lg hover:bg-melagro-secondary transition-all">Reorder</button>
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {order.items.map((item, i) => (
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

    const renderChamas = () => {
        const myChamas = activeChamas.filter((c: ChamaGroup) => c.members.some((m: any) => m.userId === user?.uid));
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">My Chama Groups</h2>
                    <Link href="/products" className="text-sm font-bold text-melagro-primary hover:underline">+ Start New</Link>
                </div>
                {myChamas.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
                        <p className="text-gray-500 mb-6">No active Chamas found.</p>
                        <Link href="/products" className="btn-primary">Browse Products</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {myChamas.map((chama: ChamaGroup) => (
                            <div key={chama.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-xl transition-all">
                                <div className="aspect-video relative overflow-hidden bg-gray-50">
                                    <Image src={chama.productImage} alt={chama.productName} fill className="object-cover transition-transform group-hover:scale-105" />
                                    <div className="absolute top-3 left-3">
                                        <span className="bg-melagro-primary text-white text-[10px] font-bold px-2 py-1 rounded-full">ACTIVE</span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-900 mb-1">{chama.productName}</h3>
                                    <p className="text-lg font-black text-melagro-primary mb-3">KES {chama.price.toLocaleString()}</p>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-2">
                                        <div className="bg-melagro-primary h-full transition-all" style={{ width: `${(chama.members.length / chama.targetSize) * 100}%` }}></div>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                                        <span>{chama.members.length} / {chama.targetSize} Members</span>
                                        <button onClick={() => toast.success("Link Copied!")} className="text-melagro-primary">Share Link</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
                <a href="mailto:support@melagro.com" className="p-6 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all">
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
                                <div className="w-16 h-16 bg-gradient-to-tr from-melagro-primary to-green-400 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-melagro-primary/10">
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
                                    { id: 'chamas', label: 'My Chamas', icon: '👥' },
                                    { id: 'returns', label: 'Returns', icon: '🔄' },
                                    { id: 'notifications', label: 'Alerts', icon: '🔔' },
                                    { id: 'profile', label: 'Settings', icon: '⚙️' },
                                    { id: 'support', label: 'Support', icon: '🎧' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id as Tab)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === item.id
                                                ? 'bg-melagro-primary text-white shadow-xl shadow-melagro-primary/20 translate-x-1'
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-melagro-primary'
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
                        {activeTab === 'chamas' && renderChamas()}
                        {activeTab === 'support' && renderSupport()}
                        {activeTab === 'profile' && (
                            <div className="max-w-2xl bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                                <h2 className="text-2xl font-bold text-gray-900 mb-8">Profile Settings</h2>
                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Full Name</label>
                                            <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} disabled={!isEditingProfile} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-melagro-primary/20 disabled:opacity-50 font-medium" />
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
                                                <button type="submit" className="px-8 py-3 bg-melagro-primary text-white rounded-2xl font-bold shadow-lg shadow-melagro-primary/20 hover:scale-105 transition-all">Save Changes</button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => setIsEditingProfile(true)} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:scale-105 transition-all">Edit Profile</button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )}
                        {/* Fallback for other tabs if not implemented yet */}
                        {!['dashboard', 'orders', 'chamas', 'support', 'profile'].includes(activeTab) && (
                            <div className="bg-white p-20 rounded-3xl border border-gray-100 text-center shadow-sm">
                                <div className="text-6xl mb-6">🛠️</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Coming Soon</h3>
                                <p className="text-gray-500 font-medium">We're working hard to bring you this feature.</p>
                            </div>
                        )}
                    </div>
                </div>
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
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-melagro-primary/20">
                    <option>Order Inquiry</option>
                    <option>Product Question</option>
                    <option>Technical Support</option>
                    <option>Other</option>
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Message</label>
                <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-melagro-primary/20" placeholder="How can we help you?" required></textarea>
            </div>
            <button type="submit" disabled={status === 'sending' || status === 'success'} className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${status === 'success' ? 'bg-green-500' : 'bg-melagro-primary hover:scale-[1.02]'}`}>
                {status === 'sending' ? 'Sending...' : status === 'success' ? 'Message Sent!' : 'Send Message'}
            </button>
        </form>
    );
}
