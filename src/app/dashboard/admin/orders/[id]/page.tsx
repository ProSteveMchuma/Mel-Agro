"use client";
import { useOrders } from "@/context/OrderContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminOrderDetailsPage() {
    const { orders, updateOrderStatus } = useOrders();
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);

    useEffect(() => {
        if (params.id) {
            const foundOrder = orders.find(o => o.id === params.id);
            setOrder(foundOrder);
        }
    }, [params.id, orders]);

    if (!order) {
        return <div className="p-8 text-center">Loading order details...</div>;
    }

    return (
        <div className="space-y-6">
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-4">
                ← Back to Orders
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
                    <p className="text-gray-500 text-sm">Placed on {new Date(order.date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={`/orders/${order.id}/receipt`}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                        Print Receipt
                    </Link>
                    <Link
                        href={`/orders/${order.id}/delivery-note`}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                        Delivery Note
                    </Link>
                </div>
            </div>

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
                        <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                            className="w-full p-2 rounded-lg border border-gray-200 focus:border-melagro-primary focus:ring-1 focus:ring-melagro-primary outline-none transition-all"
                        >
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Update the status to notify the customer.
                        </p>
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
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Shipping Address</h2>
                        <p className="text-gray-900 font-medium">{order.shippingAddress?.details || 'N/A'}</p>
                        <p className="text-gray-600">{order.shippingAddress?.county || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
