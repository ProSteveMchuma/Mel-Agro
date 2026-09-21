import React from 'react';
import { Order } from '@/context/OrderContext';
import { useSettings } from '@/context/SettingsContext';
import Logo from '../Logo';
import { DEFAULT_DOCUMENT_SETTINGS, resolveDocumentBranding, type DocumentTemplateSettings } from '@/lib/document-branding';
import { computeOrderDocumentTotals } from '@/lib/document-totals';

interface InvoiceTemplateProps {
    order: Order;
    settings?: Partial<DocumentTemplateSettings>;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ order, settings: propSettings }) => {
    const { general, tax, documents } = useSettings();
    const docSettings: DocumentTemplateSettings = {
        ...DEFAULT_DOCUMENT_SETTINGS,
        ...documents,
        ...propSettings,
    };
    const brand = resolveDocumentBranding({
        companyName: general.companyName,
        address: general.address,
        supportPhone: general.supportPhone,
        supportEmail: general.supportEmail,
        websiteUrl: general.websiteUrl,
        taxId: tax.taxId,
        logoUrl: general.logoUrl,
    });
    const totals = computeOrderDocumentTotals(order, tax);

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-gray-900 print:max-w-none" id="invoice-template">
            <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b-4 border-gray-900 pb-8 gap-6">
                <div>
                    <h1 className="text-5xl font-black mb-2 tracking-tighter" style={{ color: docSettings.primaryColor }}>{docSettings.invoiceTitle}</h1>
                    <p className="text-gray-400 font-mono text-xs">#{order.id}</p>
                    <p className="text-gray-900 font-bold mt-2">Date: {new Date(order.date).toLocaleDateString()}</p>
                    {brand.taxId ? (
                        <p className="text-xs text-gray-500 mt-2 font-mono">KRA PIN: {brand.taxId}</p>
                    ) : null}
                </div>
                <div className="md:text-right flex flex-col items-end">
                    {docSettings.showLogo && (
                        brand.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brand.logoUrl} alt={brand.companyName} className="h-12 w-auto mb-4 object-contain" />
                        ) : (
                            <Logo className="mb-4 scale-125 origin-right" />
                        )
                    )}
                    <div className="text-xl font-black text-gray-900 mb-1">{brand.companyName}</div>
                    <p className="text-gray-500 text-xs max-w-[220px]">{brand.address}</p>
                    <p className="text-gray-500 text-xs">{brand.supportEmail}</p>
                    <p className="text-gray-800 text-xs font-bold">{brand.supportPhone}</p>
                    <p className="text-gray-500 text-xs">{brand.websiteUrl}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-4">Bill To</h3>
                    {order.userName && order.userName !== 'User' && (
                        <div className="font-bold text-gray-900">{order.userName}</div>
                    )}
                    {order.userEmail && <div className="font-medium text-gray-700">{order.userEmail}</div>}
                    {order.phone && <div className="text-gray-700">{order.phone}</div>}
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
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'Delivered' || order.status === 'Collected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>{order.status}</span>
                    </div>
                    {order.paymentStatus ? (
                        <div className="mt-3">
                            <span className="text-gray-500 uppercase text-xs font-bold tracking-wider mr-4">Payment</span>
                            <span className="font-medium">{order.paymentStatus}</span>
                        </div>
                    ) : null}
                </div>
            </div>

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
                                <td className="py-4 text-right text-gray-600">KES {Number(item.price || 0).toLocaleString()}</td>
                                <td className="py-4 text-right font-medium text-gray-900">KES {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end mb-12">
                <div className="w-full md:w-72 space-y-3">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>KES {totals.itemsSubtotal.toLocaleString()}</span>
                    </div>
                    {totals.discount > 0 ? (
                        <div className="flex justify-between text-gray-600">
                            <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                            <span>- KES {totals.discount.toLocaleString()}</span>
                        </div>
                    ) : null}
                    {tax.enabled && tax.taxRate > 0 ? (
                        <div className="flex justify-between text-gray-600">
                            <span>{totals.taxLabel} incl.</span>
                            <span>KES {totals.taxAmount.toLocaleString()}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between text-gray-600">
                        <span>Shipping</span>
                        <span>{totals.shipping === 0 ? 'FREE' : `KES ${totals.shipping.toLocaleString()}`}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-4 border-t border-gray-200">
                        <span>Total</span>
                        <span>KES {totals.total.toLocaleString()}</span>
                    </div>
                    {totals.taxNote ? (
                        <p className="text-[10px] text-gray-400 text-right leading-snug">{totals.taxNote}</p>
                    ) : null}
                </div>
            </div>

            <div className="border-t border-gray-100 pt-8 text-center text-gray-500 text-sm">
                <p className="mb-2 font-medium">{docSettings.footerText}</p>
                <p className="text-xs text-gray-400 max-w-lg mx-auto whitespace-pre-line">{docSettings.terms}</p>
            </div>
        </div>
    );
};
