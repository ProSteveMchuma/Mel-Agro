"use client";
import { useOrders } from "@/context/OrderContext";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ReceiptPage() {
    const { orders } = useOrders();
    const params = useParams();
    const [order, setOrder] = useState<any>(null);

    useEffect(() => {
        if (params.id) {
            const foundOrder = orders.find(o => o.id === params.id);
            setOrder(foundOrder);
        }
    }, [params.id, orders]);

    if (!order) {
        return <div className="p-8 text-center">Loading receipt...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:bg-white print:p-0">
            <div className="max-w-3xl mx-auto bg-white p-12 rounded-xl shadow-sm print:shadow-none">
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-3xl font-bold text-melagro-primary mb-2">MelAgro</h1>
                        <p className="text-gray-500 text-sm">Premium Agricultural Solutions</p>
                        <p className="text-gray-500 text-sm">Nairobi, Kenya</p>
                        <p className="text-gray-500 text-sm">support@melagro.com</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">RECEIPT</h2>
                        <p className="text-gray-600">Order #: {order.id}</p>
                        <p className="text-gray-600">Date: {new Date(order.date).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Bill To */}
                <div className="mb-12">
                    <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Bill To</h3>
                    <p className="font-bold text-gray-900">Customer ID: {order.userId}</p>
                    <p className="text-gray-600">{order.shippingAddress?.details || 'Standard Delivery'}</p>
                    <p className="text-gray-600">{order.shippingAddress?.county}</p>
                </div>

                {/* Items */}
                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b-2 border-gray-100">
                            <th className="text-left py-3 font-bold text-gray-900">Item</th>
                            <th className="text-center py-3 font-bold text-gray-900">Qty</th>
                            <th className="text-right py-3 font-bold text-gray-900">Price</th>
                            <th className="text-right py-3 font-bold text-gray-900">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
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

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>KES {(order.total - (order.shippingCost || 0)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Shipping</span>
                            <span>KES {(order.shippingCost || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl text-gray-900 pt-3 border-t border-gray-200">
                            <span>Total</span>
                            <span>KES {order.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-500 text-sm border-t border-gray-100 pt-8">
                    <p>Thank you for your business!</p>
                    <p className="mt-2">For any questions, please contact us at support@melagro.com</p>
                </div>

                {/* Print Button (Hidden when printing) */}
                <div className="mt-12 text-center print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="btn-primary px-8 py-3 shadow-lg hover:shadow-xl"
                    >
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
}
