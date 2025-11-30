"use client";
import { useUsers } from "@/context/UserContext";
import { useOrders } from "@/context/OrderContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function UserDetailsPage() {
    const { users } = useUsers();
    const { orders } = useOrders();
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userOrders, setUserOrders] = useState<any[]>([]);

    useEffect(() => {
        if (params.id) {
            const foundUser = users.find(u => u.id === params.id);
            if (foundUser) {
                setUser(foundUser);
                // In a real app, we'd query orders by userId. 
                // Here we might need to match by email if userId isn't consistent in mock data, 
                // but let's try matching by ID or Email for robustness in this demo.
                const relatedOrders = orders.filter(o => o.userId === foundUser.id || o.userEmail === foundUser.email);
                setUserOrders(relatedOrders);
            }
        }
    }, [params.id, users, orders]);

    if (!user) {
        return <div className="p-8 text-center">Loading user details...</div>;
    }

    const totalSpent = userOrders.reduce((sum, order) => sum + order.total, 0);

    return (
        <div className="space-y-6">
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-4">
                ← Back to Users
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Profile Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-2xl mb-4">
                            {user.name.charAt(0)}
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
                        <p className="text-gray-500 text-sm">{user.email}</p>
                        <div className="mt-4 flex gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                {user.role}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {user.status}
                            </span>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Joined</span>
                            <span className="text-gray-900">{user.joinDate}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total Orders</span>
                            <span className="text-gray-900 font-bold">{userOrders.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total Spent</span>
                            <span className="text-gray-900 font-bold">KES {totalSpent.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Order History */}
                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900">Order History</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Order ID</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Total</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {userOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{order.id}</td>
                                        <td className="px-6 py-4 text-gray-600">{new Date(order.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">KES {order.total.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                        order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/dashboard/admin/orders/${order.id}`} className="text-melagro-primary hover:text-green-700 font-medium">
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {userOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            No orders found for this user.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
