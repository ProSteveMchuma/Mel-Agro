import React from 'react';
import { Order } from '@/context/OrderContext';
import { useSettings } from '@/context/SettingsContext';

interface DeliveryNoteTemplateProps {
    order: Order;
}

export const DeliveryNoteTemplate: React.FC<DeliveryNoteTemplateProps> = ({ order }) => {
    const { general } = useSettings();

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-gray-900" id="delivery-note-template">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b border-gray-200 pb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">DELIVERY NOTE</h1>
                    <p className="text-gray-500">Order #{order.id}</p>
                    <p className="text-gray-500">Date: {new Date(order.date).toLocaleDateString()}</p>
                </div>
                <div className="md:text-right">
                    {general.logoUrl && (
                        <img src={general.logoUrl} alt="Logo" className="h-12 mb-4 ml-auto" />
                    )}
                    <div className="text-2xl font-bold text-gray-900 mb-1">{general.companyName}</div>
                    <p className="text-gray-500 text-sm">Logistics Department</p>
                    <p className="text-gray-500 text-sm">{general.address}</p>
                </div>
            </div>

            {/* Delivery Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-4">Deliver To</h3>
                    <div className="font-medium">{order.userEmail}</div>
                    <div className="text-gray-600 mt-1">{order.shippingAddress?.details || 'Address not provided'}</div>
                    <div className="text-gray-600 font-bold">{order.shippingAddress?.county || ''}</div>
                </div>
                <div className="md:text-right">
                    <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-4">Shipping Method</h3>
                    <p className="text-gray-900">Standard Ground Shipping</p>
                    <p className="text-gray-600">Carrier: MelAgro Logistics</p>
                </div>
            </div>

            {/* Items Checklist */}
            <div className="overflow-x-auto">
                <table className="w-full mb-12 min-w-[600px]">
                    <thead>
                        <tr className="border-b-2 border-gray-100">
                            <th className="text-left py-4 font-bold text-gray-900">Item Description</th>
                            <th className="text-center py-4 font-bold text-gray-900">Qty Ordered</th>
                            <th className="text-center py-4 font-bold text-gray-900">Qty Shipped</th>
                            <th className="text-center py-4 font-bold text-gray-900">Check</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {order.items.map((item, i) => (
                            <tr key={i}>
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
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-24">
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

            {/* Footer */}
            <div className="border-t border-gray-100 pt-8 text-center text-gray-500 text-sm mt-12">
                <p>Please check all items upon delivery. Claims for damaged or missing items must be made within 24 hours.</p>
            </div>
        </div>
    );
};
