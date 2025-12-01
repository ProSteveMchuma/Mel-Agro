"use client";
import { useOrders } from "@/context/OrderContext";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { InvoiceTemplate } from "@/components/documents/InvoiceTemplate";

export default function ReceiptPage() {
    const { orders } = useOrders();
    const params = useParams();
    const [order, setOrder] = useState<any>(null);

    useEffect(() => {
        if (params.id) {
            const foundOrder = orders.find(o => o.id === params.id);
            setOrder(foundOrder);
        }
    }, [params.id, orders]);

    if (!order) {
        return <div className="p-8 text-center">Loading receipt...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:bg-white print:p-0">
            <div className="max-w-4xl mx-auto bg-white shadow-sm print:shadow-none">
                <InvoiceTemplate order={order} />

                {/* Print Button (Hidden when printing) */}
                <div className="pb-12 text-center print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="bg-melagro-primary text-white px-8 py-3 rounded-lg shadow-lg hover:bg-melagro-secondary transition-colors font-bold"
                    >
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
}
