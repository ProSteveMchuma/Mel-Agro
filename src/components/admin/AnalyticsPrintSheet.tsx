import type { Granularity, KPISet, PatternBucket, PaymentMixSlice, SegmentSlice, SeriesPoint, TopItem } from "@/lib/analytics-aggregations";

const kes = (value: number) => `KES ${Math.round(value).toLocaleString("en-KE")}`;

function SheetTable({ title, note, headers, rows, total }: {
    title: string;
    note?: string;
    headers: string[];
    rows: string[][];
    total?: string[];
}) {
    return (
        <section className="mt-4">
            <h2 className="text-sm font-black">{title}</h2>
            {note && <p className="mb-1 text-[11px] text-gray-600">{note}</p>}
            <table className="w-full border-collapse text-xs">
                <thead>
                    <tr className="bg-gray-100">
                        {headers.map((header) => (
                            <th key={header} className="border border-gray-300 px-2 py-1 text-left font-black">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={headers.length} className="border border-gray-300 px-2 py-2 text-gray-500">None in this view.</td>
                        </tr>
                    ) : rows.map((row, index) => (
                        <tr key={`${title}-${index}`}>
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="border border-gray-300 px-2 py-1">{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                {total && (
                    <tfoot>
                        <tr className="font-black">
                            {total.map((cell, index) => (
                                <td key={index} className="border border-gray-300 px-2 py-1">{cell}</td>
                            ))}
                        </tr>
                    </tfoot>
                )}
            </table>
        </section>
    );
}

function sum(rows: Array<{ revenue?: number; orders?: number; units?: number; count?: number }>, key: "revenue" | "orders" | "units" | "count") {
    return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

export default function AnalyticsPrintSheet({
    rangeLabel,
    granularity,
    kpis,
    series,
    products,
    categories,
    counties,
    segments,
    dow,
    hourly,
    paymentMix,
    truncated,
    searches,
    funnel,
    pages,
    regions,
    landingSales,
    traffic,
}: {
    rangeLabel: string;
    granularity: Granularity;
    kpis: KPISet;
    series: SeriesPoint[];
    products: TopItem[];
    categories: TopItem[];
    counties: TopItem[];
    segments: SegmentSlice[];
    dow: PatternBucket[];
    hourly: PatternBucket[];
    paymentMix: PaymentMixSlice[];
    truncated: boolean;
    searches: Array<{ term: string; count: number }>;
    funnel: Array<{ label: string; count: number; note: string }>;
    pages: Array<{ key: string; views: number; uniques: number }>;
    regions: Array<{ key: string; views: number; uniques: number }>;
    landingSales: Array<{ path: string; orders: number; revenue: number; fromOrderProduct: number }>;
    traffic: Array<{ date: string; totalVisits: number; uniqueVisitors: number }>;
}) {
    return (
        <div className="hidden print:block text-black">
            <h1 className="text-xl font-black">Revenue analytics</h1>
            <p className="mt-2 border border-gray-400 px-3 py-2 text-sm">
                <span className="font-black">Filters. </span>
                Period: {rangeLabel}
                {" · "}
                Chart grouping: {granularity}
                {" · "}
                Timezone: Africa/Nairobi
                {truncated ? " · Stopped at 2,500 orders. Use a shorter period for a complete copy." : ""}
            </p>
            <SheetTable
                title="Totals"
                headers={["Paid revenue", "Paid orders", "All orders", "Average paid order", "Customers", "Repeat rate", "Paid share", "Refunds", "Cancelled"]}
                rows={[[
                    kes(kpis.revenue),
                    String(kpis.paidCount),
                    String(kpis.orderCount),
                    kes(kpis.aov),
                    String(kpis.uniqueCustomers),
                    `${kpis.repeatRate.toFixed(1)}%`,
                    `${kpis.conversionRate.toFixed(1)}%`,
                    kes(kpis.refundedRevenue),
                    String(kpis.cancelledCount),
                ]]}
            />
            <SheetTable
                title="Paid revenue by period"
                note="Each bucket is an Africa/Nairobi day, week, or month."
                headers={["Period", "Paid revenue", "Paid orders", "Average"]}
                rows={series.map((point) => [point.label, kes(point.revenue), String(point.orders), kes(point.aov)])}
                total={["Total", kes(sum(series, "revenue")), String(sum(series, "orders")), ""]}
            />
            <SheetTable
                title="Top products"
                headers={["Product", "Paid revenue", "Units"]}
                rows={products.map((item) => [item.label, kes(item.revenue), String(item.units)])}
                total={["Total", kes(sum(products, "revenue")), String(sum(products, "units"))]}
            />
            <SheetTable
                title="Revenue by category"
                headers={["Category", "Paid revenue", "Units"]}
                rows={categories.map((item) => [item.label, kes(item.revenue), String(item.units)])}
                total={["Total", kes(sum(categories, "revenue")), String(sum(categories, "units"))]}
            />
            <SheetTable
                title="Revenue by county"
                note="Top destinations shown on screen."
                headers={["County", "Paid revenue", "Paid orders"]}
                rows={counties.map((item) => [item.label, kes(item.revenue), String(item.units)])}
                total={["Total", kes(sum(counties, "revenue")), String(sum(counties, "units"))]}
            />
            <SheetTable
                title="New and repeat customers"
                headers={["Group", "Paid orders", "Paid revenue"]}
                rows={segments.map((item) => [item.label, String(item.orders), kes(item.revenue)])}
                total={["Total", String(sum(segments, "orders")), kes(sum(segments, "revenue"))]}
            />
            <SheetTable
                title="Day of week"
                note="Africa/Nairobi weekdays."
                headers={["Day", "Paid orders", "Paid revenue"]}
                rows={dow.map((item) => [item.label, String(item.orders), kes(item.revenue)])}
                total={["Total", String(sum(dow, "orders")), kes(sum(dow, "revenue"))]}
            />
            <SheetTable
                title="Hour of day"
                note="Africa/Nairobi hours. Empty hours are listed so the day still adds up."
                headers={["Hour", "Paid orders", "Paid revenue"]}
                rows={hourly.map((item) => [item.label, String(item.orders), kes(item.revenue)])}
                total={["Total", String(sum(hourly, "orders")), kes(sum(hourly, "revenue"))]}
            />
            <SheetTable
                title="Payment method"
                headers={["Method", "Paid orders", "Paid revenue"]}
                rows={paymentMix.map((item) => [item.label, String(item.orders), kes(item.revenue)])}
                total={["Total", String(sum(paymentMix, "orders")), kes(sum(paymentMix, "revenue"))]}
            />
            <SheetTable
                title="Storefront traffic"
                note="Visit dates are the stored calendar keys."
                headers={["Date", "Visits", "Anonymous devices"]}
                rows={traffic.map((item) => [item.date, String(item.totalVisits), String(item.uniqueVisitors)])}
                total={["Total", String(traffic.reduce((total, item) => total + item.totalVisits, 0)), String(traffic.reduce((total, item) => total + item.uniqueVisitors, 0))]}
            />
            <SheetTable
                title="Top searches"
                note="Lifetime counts, not limited to the date filter."
                headers={["Search", "Count"]}
                rows={searches.map((item) => [item.term, String(item.count)])}
                total={["Total", String(searches.reduce((total, item) => total + item.count, 0))]}
            />
            <SheetTable
                title="Checkout funnel"
                headers={["Step", "Count", "Note"]}
                rows={funnel.map((step) => [step.label, String(step.count), step.note])}
            />
            <SheetTable
                title="Viewers by page"
                headers={["Page", "Views", "Daily uniques"]}
                rows={pages.map((item) => [item.key, String(item.views), String(item.uniques)])}
                total={["Total", String(pages.reduce((total, item) => total + item.views, 0)), String(pages.reduce((total, item) => total + item.uniques, 0))]}
            />
            <SheetTable
                title="Sales by landing page"
                headers={["Page", "Paid orders", "Paid revenue", "From the product on the order"]}
                rows={landingSales.map((item) => [item.path, String(item.orders), kes(item.revenue), String(item.fromOrderProduct)])}
                total={["Total", String(landingSales.reduce((total, item) => total + item.orders, 0)), kes(landingSales.reduce((total, item) => total + item.revenue, 0)), ""]}
            />
            <SheetTable
                title="Visits by region"
                headers={["Region", "Views", "Daily uniques"]}
                rows={regions.map((item) => [item.key, String(item.views), String(item.uniques)])}
                total={["Total", String(regions.reduce((total, item) => total + item.views, 0)), String(regions.reduce((total, item) => total + item.uniques, 0))]}
            />
        </div>
    );
}
