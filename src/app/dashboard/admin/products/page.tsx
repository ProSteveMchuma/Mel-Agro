"use client";
import { useProducts } from "@/context/ProductContext";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import BulkUploadButton from "@/components/admin/BulkUploadButton";

export default function ProductManagement() {
    const { products, deleteProduct } = useProducts();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterStock, setFilterStock] = useState("All"); // All, In Stock, Low Stock, Out of Stock

    // Get unique categories
    const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = filterCategory === "All" || product.category === filterCategory;

        let matchesStock = true;
        const isLowStock = product.stockQuantity <= (product.lowStockThreshold || 10);
        const isOutOfStock = product.stockQuantity === 0;

        if (filterStock === "In Stock") matchesStock = !isOutOfStock;
        if (filterStock === "Low Stock") matchesStock = isLowStock && !isOutOfStock;
        if (filterStock === "Out of Stock") matchesStock = isOutOfStock;

        return matchesSearch && matchesCategory && matchesStock;
    });

    const toggleSelectAll = () => {
        if (selectedProducts.length === filteredProducts.length) {
            setSelectedProducts([]);
        } else {
            // Ensure all IDs are converted to strings for type safety
            const productIds = filteredProducts.map(p => typeof p.id === 'string' ? p.id : String(p.id));
            setSelectedProducts(productIds);
        }
    };

    const toggleSelectProduct = (id: string) => {
        if (selectedProducts.includes(id)) {
            setSelectedProducts(selectedProducts.filter(pId => pId !== id));
        } else {
            setSelectedProducts([...selectedProducts, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
            for (const id of selectedProducts) {
                await deleteProduct(id);
            }
            setSelectedProducts([]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-500 text-sm">Manage your inventory and catalog.</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedProducts.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete ({selectedProducts.length})
                        </button>
                    )}
                    <BulkUploadButton />
                    <Link href="/dashboard/admin/products/new" className="btn-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Product
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow max-w-md">
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
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:border-melagro-primary outline-none bg-white"
                >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select
                    value={filterStock}
                    onChange={(e) => setFilterStock(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:border-melagro-primary outline-none bg-white"
                >
                    <option value="All">All Stock Status</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                </select>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 w-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-melagro-primary focus:ring-melagro-primary"
                                    />
                                </th>
                                <th className="px-6 py-4 font-medium">Product</th>
                                <th className="px-6 py-4 font-medium">Category</th>
                                <th className="px-6 py-4 font-medium">Price</th>
                                <th className="px-6 py-4 font-medium">Stock Level</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.map(product => {
                                const totalStock = product.stockQuantity + (product.variants?.reduce((acc, v) => acc + (v.stockQuantity || 0), 0) || 0);
                                const isLowStock = totalStock <= (product.lowStockThreshold || 10);
                                const isOutOfStock = totalStock === 0;
                                const isSelected = selectedProducts.includes(String(product.id));

                                return (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-gray-50 transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50' : ''}`}
                                        onClick={() => router.push(`/dashboard/admin/products/edit/${product.id}`)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectProduct(String(product.id))}
                                                className="rounded border-gray-300 text-melagro-primary focus:ring-melagro-primary"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0 border border-gray-200">
                                                    <Image
                                                        src={(typeof product.image === 'string' && product.image.startsWith('http')) ? product.image : "https://placehold.co/100x100?text=No+Image"}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized={typeof product.image === 'string' && product.image.includes('firebasestorage')}
                                                    />
                                                </div>
                                                <div className="font-medium text-gray-900">{product.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">KES {product.price.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                                <span className={`font-medium ${isOutOfStock ? 'text-red-700' : isLowStock ? 'text-yellow-700' : 'text-green-700'}`}>
                                                    {totalStock} Units
                                                </span>
                                                {isLowStock && !isOutOfStock && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Low</span>
                                                )}
                                                {product.variants && product.variants.length > 0 && (
                                                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 rounded" title="Includes Variants">
                                                        {product.variants.length}V
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to delete this product?')) {
                                                            deleteProduct(product.id);
                                                        }
                                                    }}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No products found matching "{searchTerm}".
                    </div>
                )}
            </div>
        </div>
    );
}
