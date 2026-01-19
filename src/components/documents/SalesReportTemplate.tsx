import React from 'react';
import { Order } from '@/context/OrderContext';

interface SalesReportTemplateProps {
    orders: Order[];
    startDate?: Date;
    endDate?: Date;
}

export const SalesReportTemplate: React.FC<SalesReportTemplateProps> = ({ orders, startDate, endDate }) => {
    const totalSales = orders.reduce((acc, order) => acc + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Group by status
    const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-gray-900" id="sales-report-template">
            <div className="text-center mb-12 border-b-2 border-gray-900 pb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 uppercase tracking-widest">Sales Report</h1>
                <p className="text-gray-500">MelAgro Admin System</p>
                <p className="text-sm text-gray-400 mt-2">Generated on {new Date().toLocaleString()}</p>
            </div>

            {/* Executive Summary */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 mb-6 border-l-4 border-melagro-primary pl-4">Executive Summary</h2>
                <div className="grid grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-6 rounded-xl text-center">
                        <div className="text-sm text-gray-500 mb-1">Total Revenue</div>
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

            {/* Order Status Breakdown */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 mb-6 border-l-4 border-melagro-primary pl-4">Order Status Breakdown</h2>
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

            {/* Recent Transactions */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 border-l-4 border-melagro-primary pl-4">Recent Transactions</h2>
                <table className="w-full border border-gray-200 text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left py-3 px-4 font-bold text-gray-900">Date</th>
                            <th className="text-left py-3 px-4 font-bold text-gray-900">Order ID</th>
                            <th className="text-left py-3 px-4 font-bold text-gray-900">Customer</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {orders.slice(0, 20).map(order => (
                            <tr key={order.id}>
                                <td className="py-2 px-4 text-gray-600">{new Date(order.date).toLocaleDateString()}</td>
                                <td className="py-2 px-4 text-gray-900 font-mono">#{order.id.slice(0, 8)}</td>
                                <td className="py-2 px-4 text-gray-600 truncate max-w-[200px]">{order.userEmail}</td>
                                <td className="py-2 px-4 text-right font-medium">KES {order.total.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-center text-xs text-gray-400 mt-4">Showing last 20 transactions only.</p>
            </div>
        </div>
    );
};
