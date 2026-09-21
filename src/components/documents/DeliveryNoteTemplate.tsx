import React from 'react';
import { Order } from '@/context/OrderContext';
import { useSettings } from '@/context/SettingsContext';
import Logo from '../Logo';
import { PICKUP_STORE, isPickupOrder } from '@/lib/pickup';

interface DeliveryNoteTemplateProps {
    order: Order;
}

export const DeliveryNoteTemplate: React.FC<DeliveryNoteTemplateProps> = ({ order }) => {
    const { general } = useSettings();
    const pickup = isPickupOrder(order);
    const title = pickup ? 'Collection Slip' : 'Delivery Note';

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-gray-900" id="delivery-note-template">
            <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b-4 border-gray-900 pb-8 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter uppercase">{title}</h1>
                    <p className="text-gray-400 font-mono text-xs">Order #{order.id}</p>
                    <p className="text-gray-900 font-bold mt-2">Date: {new Date(order.date).toLocaleDateString()}</p>
                    {pickup ? (
                        <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-900">
                            Store collection
                        </p>
                    ) : null}
                </div>
                <div className="md:text-right flex flex-col items-end text-right">
                    <Logo className="mb-4 scale-125 origin-right" />
                    <div className="text-xl font-black text-gray-900 mb-1">{general.companyName || "Mel-Agri Kenya"}</div>
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-black">
                        {pickup ? 'Collection Desk' : 'Logistics Department'}
                    </p>
                    <p className="text-gray-500 text-xs max-w-[200px] mt-1">{general.address || "Premium Agricultural Hub"}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-4">
                        {pickup ? 'Collecting Customer' : 'Deliver To'}
                    </h3>
                    <div className="font-medium">{order.userName || order.userEmail || 'Customer'}</div>
                    {order.phone ? <div className="text-gray-600 mt-1">{order.phone}</div> : null}
                    {!pickup ? (
                        <>
                            <div className="text-gray-600 mt-1">{order.shippingAddress?.details || 'Address not provided'}</div>
                            <div className="text-gray-600 font-bold">{order.shippingAddress?.county || ''}</div>
                        </>
                    ) : (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                            <p className="font-bold">{PICKUP_STORE.name}</p>
                            <p>{PICKUP_STORE.address}</p>
                            <p className="text-xs mt-1">{PICKUP_STORE.etaText}</p>
                        </div>
                    )}
                </div>
                <div className="md:text-right">
                    <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-4">
                        {pickup ? 'Fulfilment' : 'Shipping Method'}
                    </h3>
                    {pickup ? (
                        <>
                            <p className="text-gray-900 font-bold">Machakos store collection</p>
                            <p className="text-gray-600">Customer collects in person</p>
                        </>
                    ) : (
                        <>
                            <p className="text-gray-900">Standard Ground Shipping</p>
                            <p className="text-gray-600">
                                Carrier: {(order as any).tracking?.carrier || 'Mel-Agri Logistics'}
                            </p>
                            {(order as any).tracking?.trackingNumber ? (
                                <p className="font-mono text-xs mt-1">#{(order as any).tracking.trackingNumber}</p>
                            ) : null}
                        </>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full mb-12 min-w-[600px]">
                    <thead>
                        <tr className="border-b-2 border-gray-100">
                            <th className="text-left py-4 font-bold text-gray-900">Item Description</th>
                            <th className="text-center py-4 font-bold text-gray-900">Qty Ordered</th>
                            <th className="text-center py-4 font-bold text-gray-900">{pickup ? 'Qty Issued' : 'Qty Shipped'}</th>
                            <th className="text-center py-4 font-bold text-gray-900">Check</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {order.items.map((item: any, i: number) => (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-24">
                <div>
                    <div className="border-t border-gray-300 pt-2">
                        <p className="text-sm text-gray-500">
                            {pickup ? 'Issued By (Sign & Date)' : 'Dispatched By (Sign & Date)'}
                        </p>
                    </div>
                </div>
                <div>
                    <div className="border-t border-gray-300 pt-2">
                        <p className="text-sm text-gray-500">
                            {pickup ? 'Collected By (Sign & Date)' : 'Received By (Sign & Date)'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-16 text-center text-[10px] text-gray-400 uppercase tracking-widest font-black">
                Mel-Agri Kenya — {pickup ? 'Collection Confirmation' : 'Delivery Confirmation'} Document
            </div>
        </div>
    );
};
