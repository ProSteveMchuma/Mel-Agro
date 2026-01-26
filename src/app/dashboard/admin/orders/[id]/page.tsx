"use client";
import { useOrders } from "@/context/OrderContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function AdminOrderDetailsPage() {
    const { orders, updateOrderStatus, updateOrderPaymentStatus, updateReturnStatus } = useOrders();
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [trackingInfo, setTrackingInfo] = useState({ carrier: '', trackingNumber: '' });
    const [paymentRecord, setPaymentRecord] = useState({
        amount: 0,
        reference: '',
        date: new Date().toISOString().split('T')[0],
        method: 'Cash'
    });

    useEffect(() => {
        if (params.id) {
            const foundOrder = orders.find(o => o.id === params.id);
            if (foundOrder) {
                setOrder(foundOrder);
                setPaymentRecord(prev => ({ ...prev, amount: foundOrder.total }));
            }
        }
    }, [params.id, orders]);

    const handleRecordPayment = async () => {
        if (!paymentRecord.reference) {
            toast.error("Please enter a payment reference (e.g. Receipt # or Name)");
            return;
        }
        try {
            await updateOrderPaymentStatus(order.id, 'Paid', paymentRecord);
            toast.success("Payment recorded successfully");
            setIsPaymentModalOpen(false);
        } catch (error) {
            toast.error("Failed to record payment");
        }
    };

    const handleDispatch = () => {
        if (!trackingInfo.carrier || !trackingInfo.trackingNumber) {
            toast.error("Please enter carrier and tracking number.");
            return;
        }
        updateOrderStatus(order.id, 'Shipped');
        setIsDispatchModalOpen(false);
        setOrder({ ...order, status: 'Shipped', tracking: trackingInfo });
    };

    if (!order) {
        return <div className="p-8 text-center text-gray-500">Loading order details...</div>;
    }

    const steps = ['Processing', 'Shipped', 'Delivered'];
    const currentStepIndex = steps.indexOf(order.status) === -1 ? 0 : steps.indexOf(order.status);
    const isCancelled = order.status === 'Cancelled';

    return (
        <div className="space-y-6 relative pb-20">
            <button onClick={() => router.back()} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-melagri-primary flex items-center gap-2 mb-8 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                Back to Pulse
            </button>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-black text-gray-500 rounded-md uppercase tracking-widest border border-gray-200">Order ID</span>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">#{order.id.slice(0, 8)}</h1>
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Placed on {new Date(order.date).toLocaleDateString()} at {new Date(order.date).toLocaleTimeString()}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href={`/orders/${order.id}/receipt`}
                        target="_blank"
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                    >
                        <span>🖨️</span> Receipt
                    </Link>
                    <Link
                        href={`/orders/${order.id}/invoice`}
                        target="_blank"
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-gray-900/10"
                    >
                        <span>📄</span> Invoice
                    </Link>
                    <Link
                        href={`/orders/${order.id}/delivery-note`}
                        target="_blank"
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                    >
                        <span>🚚</span> Delivery Note
                    </Link>
                </div>
            </div>

            {/* Order Timeline */}
            {!isCancelled && (
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 mb-8">
                    <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto">
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-gray-100 -z-0"></div>
                        <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-melagri-primary transition-all duration-700 -z-0`} style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}></div>

                        {steps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            return (
                                <div key={step} className="relative z-10 flex flex-col items-center bg-white px-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isCompleted ? 'bg-melagri-primary border-melagri-primary text-white shadow-lg shadow-green-500/20' : 'bg-white border-gray-200 text-gray-300'}`}>
                                        {isCompleted ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        ) : (
                                            <span className="text-xs font-black">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`mt-3 text-[10px] font-black uppercase tracking-[0.2em] ${isCurrent ? 'text-melagri-primary' : 'text-gray-400'}`}>{step}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Order Items */}
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Order Payload</h2>
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-black text-gray-500 uppercase">{order.items.length} Units</span>
                        </div>
                        <div className="p-8">
                            <div className="space-y-6">
                                {order.items.map((item: any) => (
                                    <div key={item.id} className="flex items-center gap-6 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                        <div className="w-16 h-16 bg-gray-100 rounded-xl items-center justify-center flex text-xl">📦</div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{item.name}</p>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Ref: {String(item.id).slice(0, 8)}</p>
                                        </div>
                                        <div className="text-center px-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Qty</p>
                                            <p className="font-black text-gray-900">{item.quantity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total</p>
                                            <p className="font-black text-gray-900">KES {(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-12 pt-8 border-t border-gray-50 flex justify-end">
                                <div className="w-full max-w-xs space-y-4">
                                    <div className="flex justify-between text-gray-400 font-bold text-xs uppercase tracking-widest">
                                        <span>Subtotal</span>
                                        <span className="text-gray-900">KES {(order.total - (order.shippingCost || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-400 font-bold text-xs uppercase tracking-widest">
                                        <span>Shipping</span>
                                        <span className="text-gray-900">KES {(order.shippingCost || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-end pt-4 border-t border-gray-100">
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Net Total</span>
                                        <span className="text-3xl font-black text-melagri-primary tracking-tighter">KES {order.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Status & Control Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Execution Status</h2>
                        <div className="mb-8">
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                    order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                }`}>
                                {order.status}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {order.status === 'Processing' && (
                                <button
                                    onClick={() => setIsDispatchModalOpen(true)}
                                    className="w-full bg-melagri-primary text-white py-4 rounded-2xl hover:bg-melagri-secondary transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-green-500/10 active:scale-95"
                                >
                                    Dispatch Order
                                </button>
                            )}

                            {order.status === 'Shipped' && (
                                <button
                                    onClick={() => updateOrderStatus(order.id, 'Delivered')}
                                    className="w-full bg-green-600 text-white py-4 rounded-2xl hover:bg-green-700 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-green-600/10 active:scale-95"
                                >
                                    Mark as Delivered
                                </button>
                            )}

                            <div className="relative pt-4 mt-4 border-t border-gray-50">
                                <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3 block">Override Status</label>
                                <select
                                    value={order.status}
                                    onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                                    className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-600 focus:bg-white focus:border-melagri-primary outline-none transition-all"
                                >
                                    <option value="Processing">Processing</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Customer Intelligence */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Identity</h2>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 font-black text-xl">
                                {order.userEmail?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <div className="font-black text-gray-900 tracking-tight leading-none mb-1">User Profile</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate max-w-[150px]">{order.userEmail}</div>
                            </div>
                        </div>
                        <Link
                            href={`/dashboard/admin/users/${order.userId}`}
                            className="inline-flex items-center gap-2 text-[10px] font-black text-melagri-primary uppercase tracking-widest hover:underline"
                        >
                            Deep Dive Insight →
                        </Link>
                    </div>

                    {/* Logistics Intelligence */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logistics</h2>
                            <button
                                onClick={() => setIsDispatchModalOpen(true)}
                                className="text-[10px] font-black text-melagri-primary uppercase hover:underline"
                            >
                                {order.tracking ? 'Edit' : 'Add'}
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Destination</p>
                                <p className="text-gray-900 font-bold leading-snug">{order.shippingAddress?.details || 'N/A'}</p>
                                <p className="text-gray-400 text-[10px] font-black uppercase mt-1">{order.shippingAddress?.county || 'N/A'}</p>
                            </div>

                            {order.tracking ? (
                                <div className="mt-6 pt-6 border-t border-gray-50 p-4 rounded-2xl bg-green-50/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">In Transit</p>
                                    </div>
                                    <p className="text-xs text-gray-900 font-black uppercase tracking-tight">{order.tracking.carrier}</p>
                                    <p className="text-[10px] text-green-600 font-mono tracking-widest mt-1 bg-white inline-block px-2 py-1 rounded-md border border-green-100">#{order.tracking.trackingNumber}</p>
                                </div>
                            ) : (
                                <div className="mt-6 pt-6 border-t border-gray-50">
                                    <p className="text-[10px] font-black text-gray-300 uppercase italic leading-loose">Waiting for dispatch payload integration...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Status Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Financial Settlement</h2>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Channel</span>
                            <span className="font-black text-gray-900 uppercase text-[10px] tracking-widest">{order.paymentMethod || 'STK Push'}</span>
                        </div>
                        <div className="mb-8">
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {order.paymentStatus || 'Unpaid'}
                            </span>
                        </div>

                        {order.paymentStatus !== 'Paid' ? (
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="w-full bg-green-600 text-white py-4 rounded-2xl hover:bg-green-700 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-green-600/10 active:scale-95"
                            >
                                Record Payment
                            </button>
                        ) : (
                            <button
                                onClick={() => updateOrderPaymentStatus(order.id, 'Unpaid')}
                                className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl hover:bg-gray-100 transition-all font-black uppercase text-[10px] tracking-widest active:scale-95"
                            >
                                Revert to Unpaid
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Record Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 transform animate-in slide-in-from-bottom-8 duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                                <span className="text-2xl">💰</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Record Payment</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Manual Transaction Override</p>
                            </div>
                        </div>

                        <div className="space-y-6 mb-10">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Settlement Amount (KES)</label>
                                <input
                                    type="number"
                                    className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 outline-none transition-all font-black text-gray-900 text-lg"
                                    value={paymentRecord.amount}
                                    onChange={(e) => setPaymentRecord({ ...paymentRecord, amount: Number(e.target.value) })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Method</label>
                                    <select
                                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest outline-none"
                                        value={paymentRecord.method}
                                        onChange={(e) => setPaymentRecord({ ...paymentRecord, method: e.target.value })}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="M-Pesa Manual">M-Pesa Manual</option>
                                        <option value="WhatsApp Confirm">WhatsApp Confirm</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest outline-none"
                                        value={paymentRecord.date}
                                        onChange={(e) => setPaymentRecord({ ...paymentRecord, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Ref / Receipt Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. CAS-9901 or TXN-ID"
                                    className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 outline-none transition-all font-mono text-sm tracking-widest"
                                    value={paymentRecord.reference}
                                    onChange={(e) => setPaymentRecord({ ...paymentRecord, reference: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordPayment}
                                className="flex-1 py-5 text-[10px] font-black text-white bg-green-600 hover:bg-green-700 rounded-[1.5rem] transition-all shadow-xl shadow-green-600/20 uppercase tracking-[0.2em] active:scale-95"
                            >
                                Secure Record
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dispatch Modal (already styled similarly) */}
            {isDispatchModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 transform animate-in slide-in-from-bottom-8 duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-melagri-primary/10 rounded-2xl flex items-center justify-center text-melagri-primary">
                                <span className="text-2xl">🚚</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Dispatch Order</h2>
                        </div>

                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-10 leading-relaxed">Enter logistics payload to synchronize shipment tracking for the customer.</p>

                        <div className="space-y-6 mb-10">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Carrier Protocol</label>
                                <input
                                    type="text"
                                    placeholder="e.g. G4S, Wells Fargo, Pickup"
                                    className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-4 focus:ring-melagri-primary/10 focus:bg-white focus:border-melagri-primary outline-none transition-all font-black uppercase text-[10px] tracking-widest"
                                    value={trackingInfo.carrier}
                                    onChange={(e) => setTrackingInfo({ ...trackingInfo, carrier: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Tracking / Reference ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. TRK-99023441"
                                    className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-4 focus:ring-melagri-primary/10 focus:bg-white focus:border-melagri-primary outline-none transition-all font-mono text-[10px] tracking-[0.2em]"
                                    value={trackingInfo.trackingNumber}
                                    onChange={(e) => setTrackingInfo({ ...trackingInfo, trackingNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsDispatchModalOpen(false)}
                                className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={handleDispatch}
                                className="flex-1 py-5 text-[10px] font-black text-white bg-melagri-primary hover:bg-melagri-secondary rounded-[1.5rem] transition-all shadow-xl shadow-melagri-primary/20 uppercase tracking-[0.2em] active:scale-95"
                            >
                                Execute Dispatch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
