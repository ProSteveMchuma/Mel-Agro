'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { Order } from '@/types';
import { downloadThermalReceiptPdf, type ThermalWidthMm } from '@/lib/thermal-receipt';

export function ReceiptPrintActions({
    order,
    branding,
    widthMm,
    onWidthMmChange,
}: {
    order: Order;
    branding?: { companyName?: string; address?: string; supportPhone?: string };
    widthMm: ThermalWidthMm;
    onWidthMmChange: (width: ThermalWidthMm) => void;
}) {
    const [busy, setBusy] = useState(false);

    const downloadPdf = async () => {
        setBusy(true);
        const notice = toast.loading(`Building ${widthMm}mm receipt PDF...`);
        try {
            await downloadThermalReceiptPdf({
                order: {
                    ...order,
                    mpesaReceiptNumber: (order as any).mpesaReceiptNumber,
                    transactionId: (order as any).transactionId,
                },
                branding,
                widthMm,
            });
            toast.success(`${widthMm}mm PDF ready`, { id: notice });
        } catch (error: any) {
            toast.error(error?.message || 'Could not build PDF', { id: notice });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="print:hidden flex flex-col sm:flex-row items-center justify-center gap-3 pb-10">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                Paper
                <select
                    value={widthMm}
                    onChange={(e) => onWidthMmChange(Number(e.target.value) as ThermalWidthMm)}
                    className="min-h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900"
                >
                    <option value={80}>80mm thermal</option>
                    <option value={58}>58mm thermal</option>
                </select>
            </label>
            <button
                type="button"
                onClick={() => window.print()}
                className="min-h-11 px-6 rounded-xl bg-melagri-primary text-white text-sm font-bold hover:bg-melagri-secondary"
            >
                Print thermal
            </button>
            <button
                type="button"
                disabled={busy}
                onClick={downloadPdf}
                className="min-h-11 px-6 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold hover:bg-slate-50 disabled:opacity-60"
            >
                {busy ? 'Building PDF...' : 'Download PDF'}
            </button>
        </div>
    );
}
