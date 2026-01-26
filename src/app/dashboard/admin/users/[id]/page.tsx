"use client";
import { useUsers } from "@/context/UserContext";
import { useOrders } from "@/context/OrderContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function UserProfilePage() {
    const { users, updateUserRole, updateUserStatus, deleteUser } = useUsers();
    const { orders } = useOrders();
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (params.id) {
            const foundUser = users.find(u => u.id === params.id);
            setUser(foundUser);
        }
    }, [params.id, users]);

    if (!user) {
        return <div className="p-8 text-center">Loading user profile...</div>;
    }

    const userOrders = orders.filter(o => o.userId === user.id);
    const totalSpend = userOrders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = userOrders.length > 0 ? totalSpend / userOrders.length : 0;

    const handleSuspendToggle = async () => {
        if (!user) return;
        const newStatus = user.status === 'active' ? 'suspended' : 'active';
        try {
            await updateUserStatus(user.id, newStatus);
            // Update local state to reflect change immediately
            setUser({ ...user, status: newStatus });
            alert(`User ${user.name} has been ${newStatus}.`);
        } catch (error) {
            console.error("Failed to update user status:", error);
            alert("Failed to update user status.");
        }
    };

    return (
        <div className="space-y-6">
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-4">
                ← Back to Users
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-2xl">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                        <p className="text-gray-500 text-sm">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <select
                                value={user.role}
                                onChange={async (e) => {
                                    const newRole = e.target.value as 'admin' | 'customer';
                                    try {
                                        await updateUserRole(user.id, newRole);
                                        setUser({ ...user, role: newRole });
                                        alert(`${user.name} is now an ${newRole}.`);
                                    } catch (err) {
                                        alert("Failed to update role.");
                                    }
                                }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-melagri-primary/20 cursor-pointer outline-none ${(user.role === 'admin' || user.role === 'super-admin') ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}
                            >
                                <option value="customer">Customer</option>
                                <option value="admin">Admin</option>
                            </select>
                            <span className={`px-2 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {user.status}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSuspendToggle}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${user.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    >
                        {user.status === 'active' ? 'Suspend User' : 'Activate User'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Spend</h3>
                    <p className="text-2xl font-bold text-gray-900">KES {totalSpend.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Orders Placed</h3>
                    <p className="text-2xl font-bold text-gray-900">{userOrders.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Avg. Order Value</h3>
                    <p className="text-2xl font-bold text-gray-900">KES {averageOrderValue.toLocaleString()}</p>
                </div>
            </div>

            {/* Order History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Order History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Order ID</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Total</th>
                                <th className="px-6 py-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {userOrders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">#{order.id}</td>
                                    <td className="px-6 py-4 text-gray-600">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                            order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">KES {order.total.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/dashboard/admin/orders/${order.id}`} className="text-melagri-primary hover:underline">
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
    );
}
