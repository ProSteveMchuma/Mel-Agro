"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/types";
import { uploadImage } from "@/lib/storage";
import { getUniqueCategories } from "@/lib/products";

interface ProductFormProps {
    initialData?: Partial<Product>;
    onSubmit: (data: Omit<Product, 'id'>) => Promise<void>;
    isSubmitting: boolean;
    title: string;
}

export default function ProductForm({ initialData, onSubmit, isSubmitting, title }: ProductFormProps) {
    const [dynamicCategories, setDynamicCategories] = useState<string[]>(['Animal Feeds', 'Fertilizers', 'Seeds', 'Crop Protection Products', 'Veterinary Products', 'Farm Tools']);

    useEffect(() => {
        getUniqueCategories().then(cats => {
            if (cats.length > 0) {
                // Merge with defaults and remove duplicates
                const merged = Array.from(new Set([...cats, 'Animal Feeds', 'Fertilizers', 'Seeds', 'Crop Protection Products', 'Veterinary Products', 'Farm Tools'])).sort();
                setDynamicCategories(merged);
            }
        });
    }, []);

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        price: initialData?.price ? initialData.price.toString() : '',
        category: initialData?.category || 'Fertilizers',
        subCategory: initialData?.subCategory || '',
        productCode: initialData?.productCode || '',
        brand: initialData?.brand || '',
        description: initialData?.description || '',
        image: initialData?.image || '',
        images: initialData?.images || [] as string[],
        stockQuantity: initialData?.stockQuantity ? initialData.stockQuantity.toString() : '0',
        lowStockThreshold: initialData?.lowStockThreshold ? initialData.lowStockThreshold.toString() : '10',
        specification: initialData?.specification || '',
        howToUse: initialData?.howToUse || '',
        tags: initialData?.tags ? initialData.tags.join(', ') : '',
        features: initialData?.features ? initialData.features.join('\n') : '',
        featured: initialData?.featured || false,
    });

    const [variants, setVariants] = useState<any[]>(initialData?.variants || []);
    const [uploading, setUploading] = useState(false);
    const [variantUploading, setVariantUploading] = useState<number | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGallery = false) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 2 * 1024 * 1024) {
                    alert(`File ${file.name} is too large (>2MB)`);
                    continue;
                }
                const url = await uploadImage(file, `products/${Date.now()}_${file.name}`);
                uploadedUrls.push(url);
            }

            if (isGallery) {
                setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
            } else if (uploadedUrls.length > 0) {
                setFormData(prev => ({ ...prev, image: uploadedUrls[0] }));
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleVariantImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setVariantUploading(index);
        try {
            if (file.size > 2 * 1024 * 1024) {
                alert(`File ${file.name} is too large (>2MB)`);
                return;
            }
            const url = await uploadImage(file, `variants/${Date.now()}_${file.name}`);
            updateVariant(index, 'image', url);
        } catch (error) {
            console.error("Error uploading variant image:", error);
            alert("Failed to upload variant image");
        } finally {
            setVariantUploading(null);
        }
    };

    const addVariant = () => {
        setVariants([...variants, { id: Date.now().toString(), name: '', price: '', stockQuantity: '', sku: '', image: '' }]);
    };

    const updateVariant = (index: number, field: string, value: string) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setVariants(newVariants);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
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

        // Process Variants
        const processedVariants = variants.map(v => ({
            ...v,
            price: v.price ? Number(v.price) : undefined,
            stockQuantity: Number(v.stockQuantity) || 0
        })).filter(v => v.name !== '');

        await onSubmit({
            name: formData.name,
            price: price,
            category: formData.category,
            subCategory: formData.subCategory,
            productCode: formData.productCode,
            brand: formData.brand,
            description: formData.description,
            image: formData.image || 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=1000&auto=format&fit=crop',
            images: formData.images,
            stockQuantity: stockQty,
            lowStockThreshold: threshold,
            inStock: stockQty > 0 || processedVariants.some(v => v.stockQuantity > 0),
            rating: initialData?.rating || 0,
            reviews: initialData?.reviews || 0,
            specification: formData.specification,
            howToUse: formData.howToUse,
            tags,
            features,
            variants: processedVariants,
            featured: formData.featured,
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
                                className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary"
                                placeholder="e.g. DAP Fertilizer"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <div className="relative">
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary pr-10"
                                >
                                    {dynamicCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    <option value="new">+ Add New Category</option>
                                </select>
                                {formData.category === 'new' && (
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            placeholder="Enter new category name"
                                            className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary text-sm font-bold"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = (e.target as HTMLInputElement).value.trim();
                                                    if (val) {
                                                        setDynamicCategories(prev => [...prev.filter(c => c !== 'new'), val, 'new'].sort());
                                                        setFormData(prev => ({ ...prev, category: val }));
                                                    }
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const val = e.target.value.trim();
                                                if (val) {
                                                    setDynamicCategories(prev => [...prev.filter(c => c !== 'new'), val, 'new'].sort());
                                                    setFormData(prev => ({ ...prev, category: val }));
                                                } else {
                                                    setFormData(prev => ({ ...prev, category: dynamicCategories[0] }));
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
                            <input
                                type="text"
                                name="subCategory"
                                value={formData.subCategory}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary"
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
                                className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary"
                                placeholder="e.g. Yara"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Code (SKU)</label>
                            <input
                                type="text"
                                name="productCode"
                                value={formData.productCode}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary"
                                placeholder="e.g. MEL-001"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                                <input
                                    type="checkbox"
                                    id="featured"
                                    name="featured"
                                    checked={formData.featured}
                                    onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                                    className="w-5 h-5 text-melagri-primary rounded focus:ring-melagri-primary border-gray-300"
                                />
                                <div>
                                    <label htmlFor="featured" className="block text-sm font-bold text-gray-900">Mark as Featured Product</label>
                                    <p className="text-xs text-gray-500">Featured products appear in the main slider and dedicated sections.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Pricing & Inventory */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-50">Pricing & Inventory</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (KES)</label>
                            <input
                                required
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Base Stock Quantity</label>
                            <input
                                required
                                type="number"
                                name="stockQuantity"
                                value={formData.stockQuantity}
                                onChange={handleChange}
                                min="0"
                                className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary"
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
                                className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary"
                                placeholder="10"
                            />
                        </div>
                    </div>

                    {/* Variants Management */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Product Variants</h4>
                                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Add different sizes, weights or packings</p>
                            </div>
                            <button
                                type="button"
                                onClick={addVariant}
                                className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-melagri-primary border border-melagri-primary/20 hover:bg-melagri-primary hover:text-white transition-all shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Variant
                            </button>
                        </div>

                        {variants.length > 0 ? (
                            <div className="space-y-3">
                                {variants.map((variant, idx) => (
                                    <div key={variant.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-end relative">
                                        <div className="md:col-span-1">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Image</label>
                                            <div className="relative w-full aspect-square bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors group">
                                                {variant.image ? (
                                                    <img src={variant.image} alt="Var" className="w-full h-full object-cover" />
                                                ) : (
                                                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => handleVariantImageUpload(idx, e)}
                                                />
                                                {variantUploading === idx && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                        <div className="w-4 h-4 border-2 border-melagri-primary border-t-transparent animate-spin rounded-full"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={variant.name}
                                                onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                                                className="w-full text-xs rounded-lg border-gray-200 focus:ring-melagri-primary focus:border-melagri-primary"
                                                placeholder="50kg"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">SKU / Code</label>
                                            <input
                                                type="text"
                                                value={variant.sku || ''}
                                                onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                                                className="w-full text-xs rounded-lg border-gray-200 focus:ring-melagri-primary focus:border-melagri-primary"
                                                placeholder="SKU-001"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Price</label>
                                            <input
                                                type="number"
                                                value={variant.price}
                                                onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                                                className="w-full text-xs rounded-lg border-gray-200 focus:ring-melagri-primary focus:border-melagri-primary"
                                                placeholder="Override"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Stock</label>
                                            <input
                                                type="number"
                                                value={variant.stockQuantity}
                                                onChange={(e) => updateVariant(idx, 'stockQuantity', e.target.value)}
                                                className="w-full text-xs rounded-lg border-gray-200 focus:ring-melagri-primary focus:border-melagri-primary"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex justify-center pb-1">
                                            <button
                                                type="button"
                                                onClick={() => removeVariant(idx)}
                                                className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">No variants added yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 3: Detailed Content */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-50">Marketing & Guides</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-melagri-primary focus-within:border-melagri-primary">
                                <textarea
                                    required
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full p-3 border-none focus:ring-0 resize-y text-sm"
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
                                    className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary text-sm"
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
                                    className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary text-sm"
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
                                    className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary text-sm"
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
                                    className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary text-sm"
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
                    <div className="space-y-8">
                        {/* Main Image */}
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Display Image (Primary)</label>
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
                                            <div className="w-6 h-6 border-2 border-melagri-primary border-t-transparent animate-spin rounded-full"></div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, false)}
                                        disabled={uploading || isSubmitting}
                                        className="block w-full text-xs text-gray-500
                                        file:mr-4 file:py-2 file:px-6
                                        file:rounded-full file:border-0
                                        file:text-[10px] file:font-black file:uppercase file:tracking-widest
                                        file:bg-melagri-primary file:text-white
                                        hover:file:bg-melagri-secondary cursor-pointer disabled:opacity-50"
                                    />
                                    <div className="mt-3">
                                        <input
                                            type="url"
                                            name="image"
                                            value={formData.image}
                                            onChange={handleChange}
                                            placeholder="Or paste primary image URL"
                                            className="text-xs w-full bg-gray-50 border-gray-100 rounded-xl focus:ring-melagri-primary/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Image Gallery */}
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Image Gallery (Maximum 5 additional)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                {formData.images.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square bg-gray-50 rounded-xl border border-gray-100 overflow-hidden group">
                                        <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                            className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100 shadow-sm"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}

                                {formData.images.length < 5 && (
                                    <label className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        </div>
                                        <span className="text-[8px] font-black text-gray-400 uppercase mt-2">Add More</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, true)}
                                            className="hidden"
                                            disabled={uploading || isSubmitting}
                                        />
                                    </label>
                                )}
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
