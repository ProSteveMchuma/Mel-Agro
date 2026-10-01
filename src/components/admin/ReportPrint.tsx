"use client";

export function ReportPrintButton({
    disabled = false,
    label = "Print / Save PDF",
}: {
    disabled?: boolean;
    label?: string;
}) {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            disabled={disabled}
            className="print:hidden min-h-11 rounded-xl bg-green-700 px-5 text-sm font-black text-white disabled:opacity-40"
        >
            {label}
        </button>
    );
}

export function ReportFilterLine({ items }: { items: Array<{ label: string; value: string }> }) {
    return (
        <p className="hidden print:block rounded-none border border-gray-400 bg-white px-3 py-2 text-sm text-black">
            <span className="font-black">Filters. </span>
            {items.map((item) => `${item.label}: ${item.value}`).join(" · ")}
            {" · Timezone: Africa/Nairobi"}
        </p>
    );
}
