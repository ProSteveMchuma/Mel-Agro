import React from 'react';
import { Order } from '@/context/OrderContext';
import { useSettings } from '@/context/SettingsContext';
import Logo from '../Logo';

interface ReceiptTemplateProps {
    order: Order;
}

export const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({ order }) => {
    const { general } = useSettings();

    return (
        <div className="bg-white p-6 max-w-md mx-auto font-mono text-sm text-gray-900 border border-gray-200" id="receipt-template">
            <div className="text-center mb-6">
                <Logo iconOnly className="mx-auto mb-2" />
                <h2 className="text-xl font-bold mb-1 uppercase tracking-tighter">{general.companyName || "MelAgro Kenya"}</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Premium Agricultural Solutions</p>
                <p className="text-xs">{general.address || "Nairobi, Kenya"}</p>
                <p className="text-xs font-bold">{general.supportPhone || "+254 748 970 757"}</p>
            </div>

            <div className="border-b border-dashed border-gray-300 pb-4 mb-4">
                <div className="flex justify-between mb-1">
                    <span>Date:</span>
                    <span>{new Date(order.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Order #:</span>
                    <span>{order.id}</span>
                </div>
            </div>

            <div className="space-y-2 mb-4 border-b border-dashed border-gray-300 pb-4">
                {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between">
                        <span>{item.quantity} x {item.name}</span>
                        <span>{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                ))}
            </div>

            <div className="space-y-2 mb-6">
                <div className="flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span>KES {order.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Payment Method</span>
                    <span>{order.paymentMethod || 'Online'}</span>
                </div>
            </div>

            <div className="text-center text-xs text-gray-500">
                <p className="mb-2">Thank you for shopping with us!</p>
                <p>Keep this receipt for your records.</p>
                <p>www.melagro.com</p>
            </div>
        </div>
    );
};
