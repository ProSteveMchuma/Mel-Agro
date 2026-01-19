import React from 'react';
import { Order } from '@/context/OrderContext';
import { useSettings } from '@/context/SettingsContext';

interface InvoiceTemplateProps {
    order: Order;
    settings?: any; // Optional settings override for preview
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ order, settings: propSettings }) => {
    const { general } = useSettings();

    // Use prop settings (for preview) or fetch from somewhere else if needed. 
    // Ideally, we should fetch document settings from context too, but for now we'll rely on props or defaults.
    const docSettings = propSettings || {
        invoiceTitle: "INVOICE",
        footerText: "Thank you for your business!",
        terms: "Payment is due within 30 days.",
        showLogo: true,
        primaryColor: "#16a34a"
    };

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-gray-900" id="invoice-template">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b border-gray-200 pb-8 gap-6">
                <div>
                    <h1 className="text-4xl font-bold mb-2" style={{ color: docSettings.primaryColor }}>{docSettings.invoiceTitle}</h1>
                    <p className="text-gray-500">#{order.id}</p>
                </div>
                <div className="md:text-right">
                    {docSettings.showLogo && general.logoUrl && (
                        <img src={general.logoUrl} alt="Logo" className="h-12 mb-4 ml-auto" />
                    )}
                    <div className="text-2xl font-bold text-gray-900 mb-1">{general.companyName}</div>
                    <p className="text-gray-500 text-sm">{general.address}</p>
                    <p className="text-gray-500 text-sm">{general.supportEmail}</p>
                    <p className="text-gray-500 text-sm">{general.supportPhone}</p>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-4">Bill To</h3>
                    <div className="font-medium">{order.userEmail}</div>
                    <div className="text-gray-600 mt-1">{order.shippingAddress?.details || 'Address not provided'}</div>
                    <div className="text-gray-600">{order.shippingAddress?.county || ''}</div>
                </div>
                <div className="md:text-right">
                    <div className="mb-4">
                        <span className="text-gray-500 uppercase text-xs font-bold tracking-wider mr-4">Invoice Date</span>
                        <span className="font-medium">{new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 uppercase text-xs font-bold tracking-wider mr-4">Status</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>{order.status}</span>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
                <table className="w-full mb-12 min-w-[600px]">
                    <thead>
                        <tr className="border-b-2 border-gray-100">
                            <th className="text-left py-4 font-bold text-gray-900">Item Description</th>
                            <th className="text-center py-4 font-bold text-gray-900">Quantity</th>
                            <th className="text-right py-4 font-bold text-gray-900">Price</th>
                            <th className="text-right py-4 font-bold text-gray-900">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {order.items.map((item: any, i: number) => (
                            <tr key={i}>
                                <td className="py-4 text-gray-900">{item.name}</td>
                                <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                                <td className="py-4 text-right text-gray-600">KES {item.price.toLocaleString()}</td>
                                <td className="py-4 text-right font-medium text-gray-900">KES {(item.price * item.quantity).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-12">
                <div className="w-full md:w-64 space-y-3">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>KES {order.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Tax (0%)</span>
                        <span>KES 0</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Shipping</span>
                        <span>KES {(order.shippingCost || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-4 border-t border-gray-200">
                        <span>Total</span>
                        <span>KES {order.total.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 pt-8 text-center text-gray-500 text-sm">
                <p className="mb-2 font-medium">{docSettings.footerText}</p>
                <p className="text-xs text-gray-400 max-w-lg mx-auto">{docSettings.terms}</p>
            </div>
        </div>
    );
};
