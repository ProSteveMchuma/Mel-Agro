"use client";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { InvoiceTemplate } from "@/components/documents/InvoiceTemplate";
import { useOrders } from "@/context/OrderContext";
import { useOrderDocument } from "@/hooks/useOrderDocument";
import type { Order } from "@/types";

export default function InvoicePage() {
    const params = useParams();
    const orderId = String(params.id || "");
    const { orders } = useOrders();
    const seed = useMemo(
        () => (orders.find((o) => String(o.id) === orderId) as Order | undefined) || null,
        [orders, orderId],
    );
    const state = useOrderDocument(orderId, seed);

    if (state.status === "loading") {
        return <div className="p-8 text-center text-gray-500">Loading invoice…</div>;
    }
    if (state.status === "error" || !state.order) {
        return <div className="p-8 text-center text-red-600">{state.error || "Invoice not found."}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:bg-white print:p-0">
            <style>{`
                @media print {
                    @page { size: A4; margin: 12mm; }
                    html, body { background: white !important; }
                }
            `}</style>
            <div className="max-w-4xl mx-auto bg-white shadow-sm print:shadow-none print:max-w-none">
                <InvoiceTemplate order={state.order as any} />
                <div className="pb-12 text-center print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="bg-slate-900 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-slate-800 transition-colors font-bold"
                    >
                        Print Invoice
                    </button>
                </div>
            </div>
        </div>
    );
}
