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
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [trackingInfo, setTrackingInfo] = useState({ carrier: '', trackingNumber: '' });

    useEffect(() => {
        if (params.id) {
            const foundOrder = orders.find(o => o.id === params.id);
            setOrder(foundOrder);
        }
    }, [params.id, orders]);

    const handleDispatch = () => {
        if (!trackingInfo.carrier || !trackingInfo.trackingNumber) {
            toast.error("Please enter carrier and tracking number.");
            return;
        }
        // In a real app, we would save the tracking info to the order object in Firestore here
        updateOrderStatus(order.id, 'Shipped');
        setIsDispatchModalOpen(false);
        // Optimistically update local state
        setOrder({ ...order, status: 'Shipped', tracking: trackingInfo });
    };

    if (!order) {
        return <div className="p-8 text-center">Loading order details...</div>;
    }

    const steps = ['Processing', 'Shipped', 'Delivered'];
    const currentStepIndex = steps.indexOf(order.status) === -1 ? 0 : steps.indexOf(order.status);
    const isCancelled = order.status === 'Cancelled';

    return (
        <div className="space-y-6 relative">
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-4">
                ← Back to Orders
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
                    <p className="text-gray-500 text-sm">Placed on {new Date(order.date).toLocaleDateString()} at {new Date(order.date).toLocaleTimeString()}</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={`/orders/${order.id}/receipt`}
                        target="_blank"
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Receipt
                    </Link>
                    <Link
                        href={`/orders/${order.id}/invoice`}
                        target="_blank"
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Print Invoice
                    </Link>
                    <Link
                        href={`/orders/${order.id}/delivery-note`}
                        target="_blank"
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2" />
                        </svg>
                        Delivery Note
                    </Link>
                </div>
            </div>

            {/* Order Timeline */}
            {!isCancelled && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto">
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-0"></div>
                        <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-melagro-primary transition-all duration-500 -z-0`} style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}></div>

                        {steps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            return (
                                <div key={step} className="relative z-10 flex flex-col items-center bg-white px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${isCompleted ? 'bg-melagro-primary border-melagro-primary text-white' : 'bg-white border-gray-300 text-gray-300'}`}>
                                        {isCompleted ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <span className="text-xs">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`mt-2 text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-melagro-primary' : 'text-gray-500'}`}>{step}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Order Items */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Items</h2>
                        </div>
                        <div className="p-6">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-500">
                                        <th className="pb-3 font-medium">Product</th>
                                        <th className="pb-3 font-medium text-center">Qty</th>
                                        <th className="pb-3 font-medium text-right">Price</th>
                                        <th className="pb-3 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="py-4 text-gray-900">{item.name}</td>
                                            <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                                            <td className="py-4 text-right text-gray-600">KES {item.price.toLocaleString()}</td>
                                            <td className="py-4 text-right font-bold text-gray-900">KES {(item.price * item.quantity).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-6 border-t border-gray-100 pt-6 flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal</span>
                                        <span>KES {(order.total - (order.shippingCost || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Shipping</span>
                                        <span>KES {(order.shippingCost || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-xl text-gray-900 pt-2 border-t border-gray-100">
                                        <span>Total</span>
                                        <span>KES {order.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Order Status</h2>
                        <div className="mb-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                    order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                }`}>
                                {order.status}
                            </span>
                        </div>

                        {order.status === 'Processing' && (
                            <button
                                onClick={() => setIsDispatchModalOpen(true)}
                                className="w-full bg-melagro-primary text-white py-2 rounded-lg hover:bg-melagro-secondary transition-colors font-medium mb-3"
                            >
                                Dispatch Order
                            </button>
                        )}

                        {order.status === 'Shipped' && (
                            <button
                                onClick={() => updateOrderStatus(order.id, 'Delivered')}
                                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium mb-3"
                            >
                                Mark as Delivered
                            </button>
                        )}

                        <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                            className="w-full p-2 rounded-lg border border-gray-200 text-sm text-gray-500 focus:border-melagro-primary outline-none"
                        >
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Customer Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Customer</h2>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                {order.userEmail?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">User {order.userId}</div>
                                <div className="text-xs text-gray-500">{order.userEmail}</div>
                            </div>
                        </div>
                        <Link
                            href={`/dashboard/admin/users/${order.userId}`}
                            className="text-sm text-melagro-primary hover:underline"
                        >
                            View Customer Profile
                        </Link>
                    </div>

                    {/* Shipping Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Logistics</h2>
                            <button
                                onClick={() => setIsDispatchModalOpen(true)}
                                className="text-[10px] font-black text-melagro-primary uppercase hover:underline"
                            >
                                {order.tracking ? 'Edit Tracking' : 'Add Tracking'}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-gray-300 uppercase mb-1">Shipping Address</p>
                                <p className="text-gray-900 font-medium leading-relaxed">{order.shippingAddress?.details || 'N/A'}</p>
                                <p className="text-gray-500 text-sm">{order.shippingAddress?.county || 'N/A'}</p>
                            </div>

                            {order.tracking ? (
                                <div className="mt-4 pt-4 border-t border-gray-50 bg-gray-50/50 p-3 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-melagro-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <p className="text-[10px] font-black text-melagro-primary uppercase">Dispatched</p>
                                    </div>
                                    <p className="text-sm text-gray-900 font-bold">{order.tracking.carrier}</p>
                                    <p className="text-xs text-melagro-primary font-mono tracking-wider mt-1">{order.tracking.trackingNumber}</p>
                                </div>
                            ) : (
                                <div className="mt-4 pt-4 border-t border-gray-50">
                                    <p className="text-[10px] font-black text-gray-300 uppercase italic">Waiting for dispatch details...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Status Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Payment Status</h2>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-600">Method:</span>
                            <span className="font-medium capitalize">{order.paymentMethod || 'N/A'}</span>
                        </div>
                        <div className="mb-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {order.paymentStatus || 'Unpaid'}
                            </span>
                        </div>

                        {order.paymentStatus !== 'Paid' ? (
                            <button
                                onClick={() => updateOrderPaymentStatus(order.id, 'Paid')}
                                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                Mark as Paid
                            </button>
                        ) : (
                            <button
                                onClick={() => updateOrderPaymentStatus(order.id, 'Unpaid')}
                                className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Mark as Unpaid
                            </button>
                        )}
                    </div>

                    {/* Return Request Card */}
                    {order.returnStatus && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Return Request</h2>

                            <div className="mb-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${order.returnStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                                    order.returnStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {order.returnStatus}
                                </span>
                            </div>

                            <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 font-bold mb-1">Reason:</p>
                                <p className="text-sm text-gray-700 italic">"{order.returnReason}"</p>
                            </div>

                            {order.returnStatus === 'Requested' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateReturnStatus(order.id, 'Approved')}
                                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => updateReturnStatus(order.id, 'Rejected')}
                                        className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dispatch Modal */}
            {isDispatchModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-melagro-primary/10 rounded-xl flex items-center justify-center text-melagro-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Dispatch Order</h2>
                        </div>

                        <p className="text-gray-500 text-sm mb-8 leading-relaxed">Enter the logistics details to notify the customer that their order is on the way.</p>

                        <div className="space-y-6 mb-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Logistics Carrier</label>
                                <input
                                    type="text"
                                    placeholder="e.g. G4S, Wells Fargo, Pickup"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-100 focus:ring-2 focus:ring-melagro-primary/20 focus:bg-white focus:border-melagro-primary outline-none transition-all font-medium text-gray-900"
                                    value={trackingInfo.carrier}
                                    onChange={(e) => setTrackingInfo({ ...trackingInfo, carrier: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Tracking / Reference Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. TRK-99023441"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-100 focus:ring-2 focus:ring-melagro-primary/20 focus:bg-white focus:border-melagro-primary outline-none transition-all font-mono text-gray-900"
                                    value={trackingInfo.trackingNumber}
                                    onChange={(e) => setTrackingInfo({ ...trackingInfo, trackingNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsDispatchModalOpen(false)}
                                className="flex-1 py-3 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={handleDispatch}
                                className="flex-1 py-4 text-xs font-black text-white bg-melagro-primary hover:bg-melagro-secondary rounded-2xl transition-all shadow-lg shadow-melagro-primary/20 uppercase tracking-[0.2em]"
                            >
                                Confirm & Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
