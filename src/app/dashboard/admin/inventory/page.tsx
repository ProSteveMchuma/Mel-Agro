"use client";
import { useProducts } from "@/context/ProductContext";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useOrders } from "@/context/OrderContext";

export default function InventoryManagement() {
    const { products, updateProduct } = useProducts();
    const { orders } = useOrders();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");

    const calculateVelocity = (productId: string | number) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let totalQtySold = 0;
        orders.forEach(order => {
            const orderDate = new Date(order.date);
            if (orderDate >= thirtyDaysAgo && order.status !== 'Cancelled') {
                order.items.forEach(item => {
                    if (String(item.id) === String(productId)) {
                        totalQtySold += item.quantity;
                    }
                });
            }
        });

        const velocity = totalQtySold / 30; // Daily average
        return {
            velocity,
            totalSold: totalQtySold
        };
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdjustStock = async (id: string | number, currentStock: number, adjustment: number) => {
        const newStock = Math.max(0, currentStock + adjustment);
        await updateProduct(id, { stockQuantity: newStock, inStock: newStock > 0 });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                <p className="text-gray-500 text-sm">Quickly adjust stock levels and monitor inventory.</p>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative max-w-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-melagro-primary focus:ring-1 focus:ring-melagro-primary outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-[10px] tracking-widest font-black">
                            <tr>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Current Stock</th>
                                <th className="px-6 py-4">Sales Velocity (30d)</th>
                                <th className="px-6 py-4">Intelligence Alert</th>
                                <th className="px-6 py-4 text-right">Quick Adjust</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.map(product => {
                                const isLowStock = product.stockQuantity <= (product.lowStockThreshold || 10);
                                const isOutOfStock = product.stockQuantity === 0;
                                const { velocity, totalSold } = calculateVelocity(product.id);

                                const daysRemaining = velocity > 0 ? Math.floor(product.stockQuantity / velocity) : Infinity;
                                const runOutDate = daysRemaining < 365 ? new Date(Date.now() + daysRemaining * 86400000).toLocaleDateString() : 'Stable';

                                return (
                                    <tr
                                        key={product.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                        onClick={() => router.push(`/dashboard/admin/products/edit/${product.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0 border border-gray-200 group-hover:scale-110 transition-transform">
                                                    <Image src={product.image} alt={product.name} fill className="object-cover" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 group-hover:text-melagro-primary transition-colors">{product.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{product.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-gray-900">
                                            {product.stockQuantity}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700">{totalSold} Units</span>
                                                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Avg {velocity.toFixed(1)}/day</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {isOutOfStock ? (
                                                <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Empty</span>
                                            ) : daysRemaining <= 7 ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">Runs out: {runOutDate}</span>
                                                    <span className="text-[8px] font-bold text-red-400 uppercase italic">Action Required</span>
                                                </div>
                                            ) : daysRemaining <= 14 ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-100">Runs out: {runOutDate}</span>
                                                </div>
                                            ) : totalSold > 10 ? (
                                                <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100">High Demand</span>
                                            ) : (
                                                <span className="bg-gray-50 text-gray-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100">Steady</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleAdjustStock(product.id, product.stockQuantity, -10)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                    title="Decrease by 10"
                                                >
                                                    -10
                                                </button>
                                                <button
                                                    onClick={() => handleAdjustStock(product.id, product.stockQuantity, -1)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                                    title="Decrease by 1"
                                                >
                                                    -1
                                                </button>
                                                <button
                                                    onClick={() => handleAdjustStock(product.id, product.stockQuantity, 1)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                                    title="Increase by 1"
                                                >
                                                    +1
                                                </button>
                                                <button
                                                    onClick={() => handleAdjustStock(product.id, product.stockQuantity, 10)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                                    title="Increase by 10"
                                                >
                                                    +10
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
