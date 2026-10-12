import React from 'react';
import { Order } from '@/context/OrderContext';
import { useSettings } from '@/context/SettingsContext';
import Logo from '../Logo';
import { buildSalesBook, type SalesBookOrder } from '@/lib/sales-book';

interface SalesReportTemplateProps {
    orders: Order[];
    startDate?: Date;
    endDate?: Date;
}

export const SalesReportTemplate: React.FC<SalesReportTemplateProps> = ({ orders, startDate, endDate }) => {
    const { general, tax } = useSettings();
    const paidOrders = orders.filter(o => o.paymentStatus === 'Paid');
    const totalSales = paidOrders.reduce((acc, order) => acc + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = paidOrders.length > 0 ? totalSales / paidOrders.length : 0;
    const reportPeriod = startDate || endDate
        ? `${startDate?.toLocaleDateString() || 'Beginning'} – ${endDate?.toLocaleDateString() || 'Present'}`
        : 'All time';
    const book = buildSalesBook(orders as SalesBookOrder[], tax);
    const kes = (value: number) => `KES ${Math.round(value).toLocaleString()}`;

    // Group by status
    const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-gray-900" id="sales-report-template">
            {/* Branded Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b-4 border-gray-900 pb-8 gap-6 text-left">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter uppercase">Sales Analytics</h1>
                    <p className="text-gray-500 font-bold">Market Performance Report</p>
                    <p className="text-xs text-gray-400 mt-2">Generated: {new Date().toLocaleString()}</p>
                </div>
                <div className="md:text-right flex flex-col items-end">
                    <Logo className="mb-4 scale-125 origin-right" />
                    <div className="text-xl font-black text-gray-900 mb-1">{general.companyName || "Mel-Agri Kenya"}</div>
                    <p className="text-gray-500 text-xs">{general.supportEmail || "admin@Mel-Agri.com"}</p>
                    <p className="text-gray-400 text-[10px] mt-1">Report period: {reportPeriod}</p>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 mb-6 border-l-4 border-melagri-primary pl-4">Executive Summary</h2>
                <div className="grid grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-6 rounded-xl text-center">
                        <div className="text-sm text-gray-500 mb-1">Total Revenue (Paid)</div>
                        <div className="text-2xl font-bold text-gray-900">KES {totalSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-xl text-center">
                        <div className="text-sm text-gray-500 mb-1">Total Orders</div>
                        <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-xl text-center">
                        <div className="text-sm text-gray-500 mb-1">Avg. Order Value</div>
                        <div className="text-2xl font-bold text-gray-900">KES {averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>
            </div>

            <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 mb-2 border-l-4 border-melagri-primary pl-4">Books</h2>
                <p className="mb-6 pl-5 text-xs text-gray-500">VAT estimate is already included in merchandise prices. It is not an extra charge. Refunds stay on the order.</p>
                <table className="w-full border border-gray-200 mb-8">
                    <tbody className="divide-y divide-gray-200">
                        {[
                            ['Goods after discount', book.goodsAfterDiscount],
                            ['Delivery fees', book.deliveryFees],
                            ['Discounts given', book.discountsGiven],
                            ['Refunds', book.refunds],
                            ['Net', book.net],
                            ['VAT estimate', book.vatEstimate],
                        ].map(([label, amount]) => (
                            <tr key={String(label)}>
                                <td className="py-3 px-4 font-bold text-gray-900">{label}</td>
                                <td className="py-3 px-4 text-right font-black text-gray-900">{kes(Number(amount))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500">Payment methods</h3>
                <table className="w-full border border-gray-200 mb-8 text-sm">
                    <thead className="bg-gray-100"><tr><th className="text-left py-2 px-4">Method</th><th className="text-right py-2 px-4">Orders</th><th className="text-right py-2 px-4">Total</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                        {[
                            ['M-Pesa Express', book.methods.stk],
                            ['Till 3130847', book.methods.till],
                            ['Cash on delivery', book.methods.cod],
                            ['Card', book.methods.card],
                        ].map(([label, row]) => (
                            <tr key={String(label)}>
                                <td className="py-2 px-4">{String(label)}</td>
                                <td className="py-2 px-4 text-right">{(row as { count: number }).count}</td>
                                <td className="py-2 px-4 text-right font-bold">{kes((row as { total: number }).total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500">Products</h3>
                {book.products.length === 0 ? <p className="mb-8 text-sm text-gray-500">No paid units in this range.</p> : (
                    <table className="w-full border border-gray-200 mb-8 text-sm">
                        <thead className="bg-gray-100"><tr><th className="text-left py-2 px-4">Product</th><th className="text-left py-2 px-4">Pack</th><th className="text-right py-2 px-4">Paid units</th><th className="text-right py-2 px-4">Paid amount</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">
                            {book.products.map((row) => (
                                <tr key={`${row.name}-${row.pack}`}>
                                    <td className="py-2 px-4">{row.name}</td>
                                    <td className="py-2 px-4">{row.pack}</td>
                                    <td className="py-2 px-4 text-right">{row.units}</td>
                                    <td className="py-2 px-4 text-right font-bold">{kes(row.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500">Discount codes</h3>
                {book.codes.length === 0 ? <p className="mb-8 text-sm text-gray-500">No discount codes in this range.</p> : (
                    <table className="w-full border border-gray-200 mb-8 text-sm">
                        <thead className="bg-gray-100"><tr><th className="text-left py-2 px-4">Code</th><th className="text-right py-2 px-4">Times used</th><th className="text-right py-2 px-4">KES given away</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">
                            {book.codes.map((row) => (
                                <tr key={row.code}><td className="py-2 px-4 font-bold">{row.code}</td><td className="py-2 px-4 text-right">{row.times}</td><td className="py-2 px-4 text-right font-bold">{kes(row.amount)}</td></tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500">Delivery fees by zone</h3>
                {book.zones.length === 0 ? <p className="mb-8 text-sm text-gray-500">No delivery fees in this range.</p> : (
                    <table className="w-full border border-gray-200 text-sm">
                        <thead className="bg-gray-100"><tr><th className="text-left py-2 px-4">Zone</th><th className="text-right py-2 px-4">Delivery fees</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">
                            {book.zones.map((row) => (
                                <tr key={row.zone}><td className="py-2 px-4">{row.zone}</td><td className="py-2 px-4 text-right font-bold">{kes(row.amount)}</td></tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Order Status Breakdown */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 mb-6 border-l-4 border-melagri-primary pl-4">Order Status Breakdown</h2>
                <table className="w-full border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left py-3 px-4 font-bold text-gray-900">Status</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900">Count</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900">Percentage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {Object.entries(statusCounts).map(([status, count]: [string, number]) => (
                            <tr key={status}>
                                <td className="py-3 px-4 text-gray-900">{status}</td>
                                <td className="py-3 px-4 text-right text-gray-900">{count}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{((count / totalOrders) * 100).toFixed(1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Recent Transactions & Audit Trail */}
            <div>
                <div className="flex justify-between items-center mb-6 border-l-4 border-melagri-primary pl-4">
                    <h2 className="text-xl font-bold text-gray-900">Transaction Audit Trail</h2>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financial Transparency Mode</span>
                </div>
                <table className="w-full border border-gray-200 text-[11px]">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left py-3 px-4 font-bold text-gray-900 uppercase tracking-wider">Stamp</th>
                            <th className="text-left py-3 px-4 font-bold text-gray-900 uppercase tracking-wider">Order ID</th>
                            <th className="text-left py-3 px-4 font-bold text-gray-900 uppercase tracking-wider">Method</th>
                            <th className="text-left py-3 px-4 font-bold text-gray-900 uppercase tracking-wider">Provenance</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900 uppercase tracking-wider">Settlement</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {orders.slice(0, 30).map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-2 px-4 text-gray-600">{new Date(order.date).toLocaleDateString()}</td>
                                <td className="py-2 px-4 text-gray-900 font-black tracking-tight">#{order.id.slice(0, 8)}</td>
                                <td className="py-2 px-4">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[9px] font-bold text-gray-500 uppercase">
                                        {order.paymentMethod || 'STK Push'}
                                    </span>
                                </td>
                                <td className="py-2 px-4 italic text-gray-500">
                                    {order.paymentMethod === 'M-Pesa' || order.paymentMethod === 'M-Pesa Checkout'
                                        ? 'System Verified'
                                        : (order.paymentStatus === 'Paid' ? 'Admin Recorded' : 'Pending Settlement')}
                                </td>
                                <td className="py-2 px-4 text-right font-black text-gray-900">KES {order.total.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-center text-[10px] text-gray-400 mt-6 italic">This report contains sensitive financial data. Authorized Mel-Agri personnel only.</p>
            </div>
        </div>
    );
};
