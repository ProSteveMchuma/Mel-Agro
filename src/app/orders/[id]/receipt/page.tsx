"use client";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useOrders } from "@/context/OrderContext";
import { useSettings } from "@/context/SettingsContext";
import { ReceiptTemplate } from "@/components/documents/ReceiptTemplate";
import { ReceiptPrintActions } from "@/components/documents/ReceiptPrintActions";
import type { ThermalWidthMm } from "@/lib/thermal-receipt";
import { useOrderDocument } from "@/hooks/useOrderDocument";
import { resolveDocumentBranding } from "@/lib/document-branding";
import type { Order } from "@/types";

export default function ReceiptPage() {
    const params = useParams();
    const orderId = String(params.id || "");
    const { orders } = useOrders();
    const { general, tax, documents } = useSettings();
    const [widthMm, setWidthMm] = useState<ThermalWidthMm>(80);
    const seed = useMemo(
        () => (orders.find((o) => String(o.id) === orderId) as Order | undefined) || null,
        [orders, orderId],
    );
    const state = useOrderDocument(orderId, seed);
    const brand = resolveDocumentBranding({
        companyName: general.companyName,
        address: general.address,
        supportPhone: general.supportPhone,
        websiteUrl: general.websiteUrl,
        taxId: tax.taxId,
    });

    if (state.status === "loading") {
        return <div className="p-8 text-center text-gray-500">Loading receipt…</div>;
    }
    if (state.status === "error" || !state.order) {
        return <div className="p-8 text-center text-red-600">{state.error || "Receipt not found."}</div>;
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
                <ReceiptTemplate order={state.order as any} variant="thermal" widthMm={widthMm} />
                <div className="mt-4">
                    <ReceiptPrintActions
                        order={state.order as any}
                        widthMm={widthMm}
                        onWidthMmChange={setWidthMm}
                        branding={{
                            companyName: brand.companyName,
                            address: brand.address,
                            supportPhone: brand.supportPhone,
                            websiteUrl: brand.websiteUrl,
                            taxId: brand.taxId,
                            footerText: documents.footerText,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
