"use client";
import { useOrders } from "@/context/OrderContext";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OrderManagement() {
    const { orders, updateOrderStatus } = useOrders();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.userId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="text-gray-500 text-sm">Manage and track customer orders.</p>
                </div>
                <Link href="/dashboard/admin/orders/create" className="btn-primary flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Order
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow max-w-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search orders..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-melagro-primary focus:ring-1 focus:ring-melagro-primary outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-200 focus:border-melagro-primary focus:ring-1 focus:ring-melagro-primary outline-none transition-all"
                >
                    <option value="All">All Statuses</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>

            {/* Order Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Order ID</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Customer</th>
                                <th className="px-6 py-4 font-medium">Total</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.map(order => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/dashboard/admin/orders/${order.id}`)}
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        <Link href={`/dashboard/admin/orders/${order.id}`} className="hover:text-melagro-primary hover:underline">
                                            {order.id}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-gray-600">User {order.userId.substr(0, 5)}...</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">KES {order.total.toLocaleString()}</td>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                                            className={`text-xs font-bold px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-melagro-primary cursor-pointer ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                    order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}
                                        >
                                            <option value="Processing">Processing</option>
                                            <option value="Shipped">Shipped</option>
                                            <option value="Delivered">Delivered</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/orders/${order.id}/receipt`} className="text-gray-500 hover:text-melagro-primary" title="Print Receipt">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                            </Link>
                                            <Link href={`/orders/${order.id}/delivery-note`} className="text-gray-500 hover:text-melagro-primary" title="Delivery Note">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredOrders.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No orders found matching your filters.
                    </div>
                )}
            </div>
        </div>
    );
}
