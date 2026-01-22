"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/types";
import { uploadImage } from "@/lib/storage";

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
        subCategory: initialData?.subCategory || '',
        supplier: initialData?.supplier || '',
        brand: initialData?.brand || '',
        description: initialData?.description || '',
        image: initialData?.image || '',
        stockQuantity: initialData?.stockQuantity ? initialData.stockQuantity.toString() : '0',
        lowStockThreshold: initialData?.lowStockThreshold ? initialData.lowStockThreshold.toString() : '10',
        specification: initialData?.specification || '',
        howToUse: initialData?.howToUse || '',
        tags: initialData?.tags ? initialData.tags.join(', ') : '',
        features: initialData?.features ? initialData.features.join('\n') : '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("File size must be less than 2MB");
            return;
        }

        setUploading(true);
        try {
            const url = await uploadImage(file, `products/${Date.now()}_${file.name}`);
            setFormData(prev => ({ ...prev, image: url }));
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const price = Number(formData.price);
        const stockQty = Number(formData.stockQuantity);
        const threshold = Number(formData.lowStockThreshold);

        if (isNaN(price) || isNaN(stockQty)) {
            alert("Please enter valid numbers for price and stock.");
            return;
        }

        // Process Tags and Features
        const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t !== '');
        const features = formData.features.split('\n').map(f => f.trim()).filter(f => f !== '');

        await onSubmit({
            name: formData.name,
            price: price,
            category: formData.category,
            subCategory: formData.subCategory,
            supplier: formData.supplier,
            brand: formData.brand,
            description: formData.description,
            image: formData.image || 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=1000&auto=format&fit=crop',
            stockQuantity: stockQty,
            lowStockThreshold: threshold,
            inStock: stockQty > 0,
            rating: initialData?.rating || 0,
            reviews: initialData?.reviews || 0,
            specification: formData.specification,
            howToUse: formData.howToUse,
            tags,
            features
        });
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

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
                {/* Section 1: Basic Information */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-50">General Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                            >
                                <option value="Animal Feeds">Animal Feeds</option>
                                <option value="Fertilizers">Fertilizers</option>
                                <option value="Seeds">Seeds</option>
                                <option value="Crop Protection Products">Crop Protection Products</option>
                                <option value="Veterinary Products">Veterinary Products</option>
                                <option value="Farm Tools">Farm Tools</option>
                                <option value="Irrigation">Irrigation</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
                            <input
                                type="text"
                                name="subCategory"
                                value={formData.subCategory}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                                placeholder="e.g. Planting Fertilizer"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                            <input
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                                placeholder="e.g. Yara"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                            <input
                                type="text"
                                name="supplier"
                                value={formData.supplier}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                                placeholder="e.g. Mel-Agri"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Pricing & Inventory */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-50">Pricing & Inventory</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
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
                </div>

                {/* Section 3: Detailed Content */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-50">Marketing & Guides</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-melagro-primary focus-within:border-melagro-primary">
                                <textarea
                                    required
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full p-3 border-none focus:ring-0 resize-y"
                                    placeholder="Brief overview of the product..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Technical Specification</label>
                                <textarea
                                    name="specification"
                                    value={formData.specification}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                                    placeholder="e.g. Nitrogen: 18%, Phosphorus: 46%..."
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">How To Use / Guide</label>
                                <textarea
                                    name="howToUse"
                                    value={formData.howToUse}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                                    placeholder="Step-by-step instructions for the farmer..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Features (One per line)</label>
                                <textarea
                                    name="features"
                                    value={formData.features}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary text-sm"
                                    placeholder="High Yield&#10;Drought Resistant&#10;Fast Maturing"
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Comma separated)</label>
                                <input
                                    type="text"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary"
                                    placeholder="hybrid, planting, 50kg"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Useful for "Related Products" logic</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 4: Media */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-50">Product Media</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-6">
                            <div className="relative w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group">
                                {formData.image ? (
                                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-4">
                                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <span className="text-[8px] font-black uppercase text-gray-400">No Image</span>
                                    </div>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-melagro-primary border-t-transparent animate-spin rounded-full"></div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <label className="block w-full">
                                    <span className="sr-only">Choose profile photo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading || isSubmitting}
                                        className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-6
                                        file:rounded-full file:border-0
                                        file:text-xs file:font-black file:uppercase file:tracking-widest
                                        file:bg-melagro-primary file:text-white
                                        hover:file:bg-melagro-secondary
                                        cursor-pointer disabled:opacity-50 transition-all"
                                    />
                                </label>
                                <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-wider">
                                    PNG, JPG or WEBP (Max 2MB).
                                </p>
                                <div className="mt-4 flex items-center gap-3">
                                    <span className="text-[10px] font-black text-gray-300 uppercase">OR URL</span>
                                    <input
                                        type="url"
                                        name="image"
                                        value={formData.image}
                                        onChange={handleChange}
                                        placeholder="Paste image URL directly"
                                        className="text-xs w-full bg-gray-50 border-gray-100 rounded-xl focus:ring-melagro-primary/20 focus:border-melagro-primary transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
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
