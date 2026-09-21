"use client";
import { useOrders } from "@/context/OrderContext";
import { useSettings } from "@/context/SettingsContext";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReceiptTemplate } from "@/components/documents/ReceiptTemplate";
import { ReceiptPrintActions } from "@/components/documents/ReceiptPrintActions";
import type { ThermalWidthMm } from "@/lib/thermal-receipt";

export default function ReceiptPage() {
    const { orders } = useOrders();
    const { general } = useSettings();
    const params = useParams();
    const [order, setOrder] = useState<any>(null);
    const [widthMm, setWidthMm] = useState<ThermalWidthMm>(80);

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
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:bg-white print:p-0 thermal-print-root">
            <style>{`
                @media print {
                    @page { size: ${widthMm}mm auto; margin: 2mm; }
                    html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    .thermal-print-root { background: white !important; padding: 0 !important; min-height: 0 !important; }
                }
            `}</style>
            <div className="mx-auto bg-white shadow-sm print:shadow-none p-2 md:p-4 print:p-0 w-fit max-w-full">
                <ReceiptTemplate order={order} variant="thermal" widthMm={widthMm} />
                <div className="mt-4">
                    <ReceiptPrintActions
                        order={order}
                        widthMm={widthMm}
                        onWidthMmChange={setWidthMm}
                        branding={{
                            companyName: general.companyName,
                            address: general.address,
                            supportPhone: general.supportPhone,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
