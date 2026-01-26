"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp, query, orderBy } from "firebase/firestore";

interface Discount {
    id: string;
    code: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    minOrderValue?: number;
    usageLimit?: number;
    expiresAt: any; // Firestore Timestamp
    isActive: boolean;
}

export default function DiscountManagementPage() {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        type: 'PERCENTAGE',
        value: '',
        minOrderValue: '',
        usageLimit: '',
        expiresAt: '',
    });

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const q = query(collection(db, "discounts"), orderBy("expiresAt", "desc"));
            const snapshot = await getDocs(q);
            const discountList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Discount[];
            setDiscounts(discountList);
        } catch (error) {
            console.error("Error fetching discounts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, "discounts"), {
                code: formData.code.toUpperCase(),
                type: formData.type,
                value: Number(formData.value),
                minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : 0,
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
                expiresAt: Timestamp.fromDate(new Date(formData.expiresAt)),
                isActive: true,
                createdAt: Timestamp.now()
            });
            setIsCreating(false);
            setFormData({ code: '', type: 'PERCENTAGE', value: '', minOrderValue: '', usageLimit: '', expiresAt: '' });
            fetchDiscounts();
        } catch (error) {
            console.error("Error creating discount:", error);
            alert("Failed to create discount.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this discount?")) return;
        try {
            await deleteDoc(doc(db, "discounts", id));
            setDiscounts(discounts.filter(d => d.id !== id));
        } catch (error) {
            console.error("Error deleting discount:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
                    <p className="text-gray-500 text-sm">Manage coupons and promotions.</p>
                </div>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="btn-primary flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {isCreating ? 'Cancel' : 'Create Discount'}
                </button>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">New Discount Code</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. SUMMER2024"
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none uppercase"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                    value={formData.expiresAt}
                                    onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <option value="PERCENTAGE">Percentage (%)</option>
                                    <option value="FIXED_AMOUNT">Fixed Amount (KES)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                                <input
                                    required
                                    type="number"
                                    placeholder={formData.type === 'PERCENTAGE' ? '10' : '500'}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min. Order Value (Optional)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                    value={formData.minOrderValue}
                                    onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit (Optional)</label>
                                <input
                                    type="number"
                                    placeholder="Unlimited"
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                    value={formData.usageLimit}
                                    onChange={e => setFormData({ ...formData, usageLimit: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-melagri-primary text-white px-6 py-2 rounded-lg hover:bg-melagri-secondary transition-colors font-bold"
                            >
                                {loading ? 'Saving...' : 'Create Discount'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Code</th>
                                <th className="px-6 py-4 font-medium">Discount</th>
                                <th className="px-6 py-4 font-medium">Min. Spend</th>
                                <th className="px-6 py-4 font-medium">Expires</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {discounts.map(discount => {
                                const isExpired = new Date(discount.expiresAt.seconds * 1000) < new Date();
                                return (
                                    <tr key={discount.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{discount.code}</td>
                                        <td className="px-6 py-4 text-melagri-primary font-medium">
                                            {discount.type === 'PERCENTAGE' ? `${discount.value}% Off` : `KES ${discount.value} Off`}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {discount.minOrderValue ? `KES ${discount.minOrderValue}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(discount.expiresAt.seconds * 1000).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${!discount.isActive ? 'bg-gray-100 text-gray-500' :
                                                    isExpired ? 'bg-red-100 text-red-700' :
                                                        'bg-green-100 text-green-700'
                                                }`}>
                                                {!discount.isActive ? 'Inactive' : isExpired ? 'Expired' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(discount.id)}
                                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {discounts.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No discount codes found. Create one to get started!
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
