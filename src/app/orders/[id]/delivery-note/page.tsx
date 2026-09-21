"use client";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { DeliveryNoteTemplate } from "@/components/documents/DeliveryNoteTemplate";
import { useOrders } from "@/context/OrderContext";
import { useOrderDocument } from "@/hooks/useOrderDocument";
import type { Order } from "@/types";

export default function DeliveryNotePage() {
    const params = useParams();
    const orderId = String(params.id || "");
    const { orders } = useOrders();
    const seed = useMemo(
        () => (orders.find((o) => String(o.id) === orderId) as Order | undefined) || null,
        [orders, orderId],
    );
    const state = useOrderDocument(orderId, seed);

    if (state.status === "loading") {
        return <div className="p-8 text-center text-gray-500">Loading delivery note…</div>;
    }
    if (state.status === "error" || !state.order) {
        return <div className="p-8 text-center text-red-600">{state.error || "Delivery note not found."}</div>;
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
                <DeliveryNoteTemplate order={state.order as any} />
                <div className="pb-12 text-center print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="bg-melagri-primary text-white px-8 py-3 rounded-lg shadow-lg hover:bg-melagri-secondary transition-colors font-bold"
                    >
                        Print Delivery Note
                    </button>
                </div>
            </div>
        </div>
    );
}
