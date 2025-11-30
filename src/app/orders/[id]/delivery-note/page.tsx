"use client";
import { useOrders } from "@/context/OrderContext";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DeliveryNotePage() {
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
        return <div className="p-8 text-center">Loading delivery note...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:bg-white print:p-0">
            <div className="max-w-3xl mx-auto bg-white p-12 rounded-xl shadow-sm print:shadow-none">
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-3xl font-bold text-melagro-primary mb-2">MelAgro</h1>
                        <p className="text-gray-500 text-sm">Logistics Department</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">DELIVERY NOTE</h2>
                        <p className="text-gray-600">Order #: {order.id}</p>
                        <p className="text-gray-600">Date: {new Date(order.date).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Delivery Details */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                        <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Deliver To</h3>
                        <p className="font-bold text-gray-900">Customer ID: {order.userId}</p>
                        <p className="text-gray-600">{order.shippingAddress?.details || 'Standard Delivery'}</p>
                        <p className="text-gray-600 font-bold">{order.shippingAddress?.county}</p>
                    </div>
                    <div>
                        <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Shipping Method</h3>
                        <p className="text-gray-900">Standard Ground Shipping</p>
                        <p className="text-gray-600">Carrier: MelAgro Logistics</p>
                    </div>
                </div>

                {/* Items Checklist */}
                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b-2 border-gray-100">
                            <th className="text-left py-3 font-bold text-gray-900">Item Description</th>
                            <th className="text-center py-3 font-bold text-gray-900">Qty Ordered</th>
                            <th className="text-center py-3 font-bold text-gray-900">Qty Shipped</th>
                            <th className="text-center py-3 font-bold text-gray-900">Check</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {order.items.map((item: any) => (
                            <tr key={item.id}>
                                <td className="py-4 text-gray-900">{item.name}</td>
                                <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                                <td className="py-4 text-center text-gray-600">_____</td>
                                <td className="py-4 text-center text-gray-300 border-l border-gray-100">
                                    <div className="w-6 h-6 border-2 border-gray-300 rounded mx-auto"></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-24">
                    <div>
                        <div className="border-t border-gray-300 pt-2">
                            <p className="text-sm text-gray-500">Dispatched By (Sign & Date)</p>
                        </div>
                    </div>
                    <div>
                        <div className="border-t border-gray-300 pt-2">
                            <p className="text-sm text-gray-500">Received By (Sign & Date)</p>
                        </div>
                    </div>
                </div>

                {/* Print Button (Hidden when printing) */}
                <div className="mt-12 text-center print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="btn-primary px-8 py-3 shadow-lg hover:shadow-xl"
                    >
                        Print Delivery Note
                    </button>
                </div>
            </div>
        </div>
    );
}
