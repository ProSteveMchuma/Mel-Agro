"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/lib/mockData"; // Or wherever Product is defined

interface ProductFormProps {
    initialData?: Partial<Product>;
    onSubmit: (data: Omit<Product, 'id'>) => Promise<void>;
    isSubmitting: boolean;
    title: string;
}

export default function ProductForm({ initialData, onSubmit, isSubmitting, title }: ProductFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        price: initialData?.price ? initialData.price.toString() : '',
        category: initialData?.category || 'Fertilizers',
        description: initialData?.description || '',
        image: initialData?.image || '',
        stockQuantity: initialData?.stockQuantity ? initialData.stockQuantity.toString() : '0',
        lowStockThreshold: initialData?.lowStockThreshold ? initialData.lowStockThreshold.toString() : '10'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const stockQty = Number(formData.stockQuantity);

        await onSubmit({
            name: formData.name,
            price: Number(formData.price),
            category: formData.category,
            description: formData.description,
            image: formData.image || 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=1000&auto=format&fit=crop',
            stockQuantity: stockQty,
            lowStockThreshold: Number(formData.lowStockThreshold),
            inStock: stockQty > 0, // Derived from quantity
            rating: initialData?.rating || 0,
            reviews: initialData?.reviews || 0
        } as any);
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/admin/products" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                        <input
                            required
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                            placeholder="e.g. DAP Fertilizer"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (KES)</label>
                        <input
                            required
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                        >
                            <option value="Fertilizers">Fertilizers</option>
                            <option value="Seeds">Seeds</option>
                            <option value="Pesticides">Pesticides</option>
                            <option value="Equipment">Equipment</option>
                            <option value="Animal Feeds">Animal Feeds</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                        <input
                            required
                            type="number"
                            name="stockQuantity"
                            value={formData.stockQuantity}
                            onChange={handleChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                        <input
                            required
                            type="number"
                            name="lowStockThreshold"
                            value={formData.lowStockThreshold}
                            onChange={handleChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                            placeholder="10"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-melagro-primary focus-within:border-melagro-primary">
                        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, description: prev.description + '**Bold Text**' }))}
                                className="p-1 hover:bg-gray-200 rounded text-gray-600 text-xs font-bold"
                                title="Bold"
                            >
                                B
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, description: prev.description + '*Italic Text*' }))}
                                className="p-1 hover:bg-gray-200 rounded text-gray-600 text-xs italic"
                                title="Italic"
                            >
                                I
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, description: prev.description + '\n- List Item' }))}
                                className="p-1 hover:bg-gray-200 rounded text-gray-600 text-xs"
                                title="Bullet List"
                            >
                                • List
                            </button>
                        </div>
                        <textarea
                            required
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={6}
                            className="w-full p-3 border-none focus:ring-0 resize-y"
                            placeholder="Detailed product description... (Markdown supported)"
                        ></textarea>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Supports basic markdown formatting.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                    <input
                        type="url"
                        name="image"
                        value={formData.image}
                        onChange={handleChange}
                        className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                        placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for default placeholder.</p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end gap-4">
                    <Link href="/dashboard/admin/products" className="btn-secondary">Cancel</Link>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary min-w-[120px] flex justify-center"
                    >
                        {isSubmitting ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            "Save Product"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
