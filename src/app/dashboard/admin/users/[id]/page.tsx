"use client";
import { useUsers } from "@/context/UserContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { getAuth } from "firebase/auth";
import { nairobiPlacedLabel } from "@/lib/order-admin";

export default function UserProfilePage() {
    const { updateUserRole, updateUserStatus } = useUsers();
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [lastOrderAt, setLastOrderAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const id = String(params.id || "");
        if (!id) return;
        const controller = new AbortController();
        setLoading(true);
        setError("");
        const timer = window.setTimeout(async () => {
            try {
                const token = await getAuth().currentUser?.getIdToken();
                if (!token) throw new Error("Admin session is unavailable.");
                const response = await fetch(`/api/admin/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Could not load this customer.");
                setUser(data.user);
                setOrders(data.orders || []);
                setLastOrderAt(data.lastOrderAt || null);
            } catch (caught) {
                if ((caught as Error).name !== "AbortError") {
                    setError(caught instanceof Error ? caught.message : "Could not load this customer.");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [params.id]);

    if (loading) {
        return <div className="p-8 text-center">Loading user profile...</div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-gray-600">{error || "Customer not found."}</div>;
    }

    const totalSpend = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const averageOrderValue = orders.length > 0 ? totalSpend / orders.length : 0;
    const suspended = user.status === "suspended";

    const handleSuspendToggle = async () => {
        const newStatus = suspended ? "active" : "suspended";
        const t = toast.loading("Updating status…");
        try {
            await updateUserStatus(user.id, newStatus);
            setUser({ ...user, status: newStatus });
            toast.success(`${user.name || "User"} is now ${newStatus}.`, { id: t });
        } catch (caught: any) {
            toast.error(caught?.message || "Failed to update user status.", { id: t });
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
                        {(user.name || user.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{user.name || "Customer"}</h1>
                        <p className="text-gray-500 text-sm">{user.email || user.phone || "No contact"}</p>
                        <p className="mt-1 text-xs text-gray-500">
                            {user.phone || "No phone"} · {user.county || "No county"} · Last order {lastOrderAt ? nairobiPlacedLabel(lastOrderAt) : "—"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <select
                                value={user.role === "customer" ? "user" : user.role}
                                onChange={async (e) => {
                                    const newRole = e.target.value as "admin" | "user";
                                    const t = toast.loading("Updating role…");
                                    try {
                                        await updateUserRole(user.id, newRole);
                                        setUser({ ...user, role: newRole });
                                        toast.success(`${user.name || "User"} is now ${newRole}.`, { id: t });
                                    } catch (err: any) {
                                        toast.error(err?.message || "Failed to update role.", { id: t });
                                    }
                                }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-melagri-primary/20 cursor-pointer outline-none ${(user.role === "admin" || user.role === "super-admin") ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}
                            >
                                <option value="user">Customer</option>
                                <option value="admin">Admin</option>
                            </select>
                            <span className={`px-2 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${suspended ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                {suspended ? "Suspended" : (user.status || "active")}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSuspendToggle}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${suspended ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                    >
                        {suspended ? "Activate User" : "Suspend User"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Spend</h3>
                    <p className="text-2xl font-bold text-gray-900">KES {totalSpend.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Orders Placed</h3>
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Avg. Order Value</h3>
                    <p className="text-2xl font-bold text-gray-900">KES {averageOrderValue.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Order History</h2>
                    {orders.length >= 100 && <p className="mt-1 text-xs text-gray-500">This profile lists 100 orders. Spend is counted from those orders.</p>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Order ID</th>
                                <th className="px-6 py-4 font-medium">Placed</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Payment</th>
                                <th className="px-6 py-4 font-medium text-right">Total</th>
                                <th className="px-6 py-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">#{String(order.id).slice(0, 10)}</td>
                                    <td className="px-6 py-4 text-gray-600">{nairobiPlacedLabel(order.date)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === "Delivered" || order.status === "Collected" ? "bg-green-100 text-green-700" :
                                            order.status === "Shipped" || order.status === "Ready for Collection" ? "bg-blue-100 text-blue-700" :
                                                order.status === "Processing" ? "bg-yellow-100 text-yellow-700" :
                                                    "bg-red-100 text-red-700"
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{order.paymentStatus || "Unpaid"}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">KES {Number(order.total || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/dashboard/admin/orders/${order.id}`} className="text-melagri-primary hover:underline">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
