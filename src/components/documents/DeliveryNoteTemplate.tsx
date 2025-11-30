import React from 'react';
import { Order } from '@/context/OrderContext';

interface DeliveryNoteTemplateProps {
    order: Order;
}

export const DeliveryNoteTemplate: React.FC<DeliveryNoteTemplateProps> = ({ order }) => {
    return (
        <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-gray-900" id="delivery-note-template">
            {/* Header */}
            <div className="flex justify-between items-start mb-12 border-b-2 border-gray-900 pb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 uppercase tracking-widest">Delivery Note</h1>
                    <p className="text-gray-500">#{order.id}</p>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold text-gray-900 mb-1">MelAgro Logistics</div>
                    <p className="text-gray-500 text-sm">Dispatch Center, Nairobi</p>
                </div>
            </div>

            {/* Delivery Details */}
            <div className="grid grid-cols-2 gap-12 mb-12 bg-gray-50 p-6 rounded-xl">
                <div>
                    <h3 className="text-gray-900 uppercase text-xs font-bold tracking-wider mb-4">Deliver To</h3>
                    <div className="font-bold text-lg">{order.userEmail}</div>
                    <div className="text-gray-600 mt-1">{order.shippingAddress?.details || 'Address not provided'}</div>
                    <div className="text-gray-600">{order.shippingAddress?.county || ''}</div>
                </div>
                <div>
                    <h3 className="text-gray-900 uppercase text-xs font-bold tracking-wider mb-4">Dispatch Info</h3>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-500">Dispatch Date:</span>
                        <span className="font-medium">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-500">Order Date:</span>
                        <span className="font-medium">{new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Shipping Method:</span>
                        <span className="font-medium">Standard Delivery</span>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-12 border border-gray-200">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="text-left py-3 px-4 font-bold text-gray-900 border-b border-gray-200">Item Code</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-900 border-b border-gray-200">Description</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-900 border-b border-gray-200">Ordered Qty</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-900 border-b border-gray-200">Shipped Qty</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-900 border-b border-gray-200">Check</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {order.items.map((item, i) => (
                        <tr key={i}>
                            <td className="py-3 px-4 text-gray-600 font-mono text-sm">{item.id}</td>
                            <td className="py-3 px-4 text-gray-900 font-medium">{item.name}</td>
                            <td className="py-3 px-4 text-center text-gray-900">{item.quantity}</td>
                            <td className="py-3 px-4 text-center text-gray-900">{item.quantity}</td>
                            <td className="py-3 px-4 text-center border-l border-gray-200">
                                <div className="w-4 h-4 border border-gray-300 mx-auto"></div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Acknowledgement */}
            <div className="mt-20 pt-8 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-12">
                    <div>
                        <p className="text-sm text-gray-500 mb-8">Received by (Name & Signature):</p>
                        <div className="border-b border-gray-300 h-8"></div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-8">Date & Time:</p>
                        <div className="border-b border-gray-300 h-8"></div>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center text-xs text-gray-400">
                <p>Please check all items upon delivery. Claims for damaged or missing items must be made within 24 hours.</p>
            </div>
        </div>
    );
};
