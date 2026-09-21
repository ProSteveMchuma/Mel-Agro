'use client';

import React from 'react';
import { Order } from '@/context/OrderContext';
import { useSettings } from '@/context/SettingsContext';
import Logo from '../Logo';
import { buildThermalReceiptLines, type ThermalWidthMm } from '@/lib/thermal-receipt';

interface ReceiptTemplateProps {
    order: Order;
    /** Thermal roll layout for POS printers. Default 80mm. */
    variant?: 'screen' | 'thermal';
    widthMm?: ThermalWidthMm;
}

export const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({
    order,
    variant = 'thermal',
    widthMm = 80,
}) => {
    const { general } = useSettings();
    const branding = {
        companyName: general.companyName || 'Mel-Agri Kenya',
        address: general.address || 'Nairobi, Kenya',
        supportPhone: general.supportPhone || '0788 970757',
    };

    if (variant === 'thermal') {
        const lines = buildThermalReceiptLines(
            {
                ...order,
                mpesaReceiptNumber: (order as any).mpesaReceiptNumber,
                transactionId: (order as any).transactionId,
            },
            branding,
            widthMm,
        );
        const widthClass = widthMm === 58 ? 'w-[58mm]' : 'w-[80mm]';

        return (
            <div
                id="receipt-template"
                data-thermal-width={widthMm}
                className={`thermal-receipt bg-white text-black font-mono mx-auto ${widthClass} max-w-full px-[3mm] py-[4mm] text-[10px] leading-snug border border-dashed border-gray-300 print:border-0`}
            >
                {lines.map((line, index) => {
                    if (line.type === 'blank') {
                        return <div key={index} className="h-2" />;
                    }
                    if (line.type === 'rule') {
                        return <div key={index} className="border-t border-dashed border-black/50 my-1.5" />;
                    }
                    if (line.type === 'center') {
                        const size =
                            line.size === 'lg' ? 'text-[12px]' : line.size === 'sm' ? 'text-[9px]' : 'text-[10px]';
                        return (
                            <p
                                key={index}
                                className={`text-center ${size} ${line.bold ? 'font-bold' : ''} break-words`}
                            >
                                {line.text}
                            </p>
                        );
                    }
                    return (
                        <div key={index} className={`flex justify-between gap-2 ${line.bold ? 'font-bold text-[11px]' : ''}`}>
                            <span className="break-words min-w-0">{line.left}</span>
                            <span className="shrink-0 tabular-nums">{line.right}</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Legacy screen-oriented layout (kept for rare non-thermal previews)
    return (
        <div className="bg-white p-6 max-w-md mx-auto font-mono text-sm text-gray-900 border border-gray-200" id="receipt-template">
            <div className="text-center mb-6">
                <Logo iconOnly className="mx-auto mb-2" />
                <h2 className="text-xl font-bold mb-1 uppercase tracking-tighter">{branding.companyName}</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Premium Agricultural Solutions</p>
                <p className="text-xs">{branding.address}</p>
                <p className="text-xs font-bold">{branding.supportPhone}</p>
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
                <p>www.Mel-Agri.com</p>
            </div>
        </div>
    );
};
