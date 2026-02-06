"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/context/ProductContext";
import { uploadImage } from "@/lib/storage";

export default function AddProductPage() {
    const router = useRouter();
    const { addProduct } = useProducts();
    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        category: "Fertilizers",
        description: "",
        image: "",
        stockQuantity: "",
        featured: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        // Auto-Capitalize Name
        if (name === 'name' && value.length > 0) {
            finalValue = value.charAt(0).toUpperCase() + value.slice(1);
        }

        // Prevent Negative Numbers
        if ((name === 'price' || name === 'stockQuantity') && Number(value) < 0) {
            finalValue = "0";
        }

        setFormData((prev: typeof formData) => ({ ...prev, [name]: finalValue }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            // Create object URL for preview
            const previewUrl = URL.createObjectURL(file);
            setFormData((prev: typeof formData) => ({ ...prev, image: previewUrl }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let imageUrl = formData.image;

            if (imageFile) {
                const path = `products/${Date.now()}_${imageFile.name}`;
                imageUrl = await uploadImage(imageFile, path);
            }

            const price = Number(formData.price) || 0;
            const stockQty = Number(formData.stockQuantity) || 0;

            await addProduct({
                name: formData.name,
                price: price,
                category: formData.category,
                description: formData.description,
                image: imageUrl,
                inStock: stockQty > 0,
                stockQuantity: stockQty,
                lowStockThreshold: 10,
                rating: 0,
                reviews: 0,
                featured: formData.featured
            });

            router.push("/dashboard/admin/products");
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Failed to add product");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h1>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (KES)</label>
                        <input
                            type="number"
                            name="price"
                            required
                            value={formData.price}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                        <input
                            type="number"
                            name="stockQuantity"
                            required
                            value={formData.stockQuantity}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                    >
                        <option value="Fertilizers">Fertilizers</option>
                        <option value="Seeds">Seeds</option>
                        <option value="Crop Protection">Crop Protection</option>
                        <option value="Animal Feeds">Animal Feeds</option>
                        <option value="Tools">Tools</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="featured"
                        name="featured"
                        checked={formData.featured}
                        onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                        className="w-4 h-4 text-melagri-primary border-gray-300 rounded focus:ring-melagri-primary"
                    />
                    <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                        Mark as Featured Product
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        name="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                    <div className="space-y-2">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-melagri-primary/10 file:text-melagri-primary hover:file:bg-melagri-primary/20"
                        />
                        <p className="text-xs text-gray-500">Or use an external URL:</p>
                        <input
                            type="text"
                            name="image"
                            placeholder="https://example.com/image.jpg"
                            value={formData.image}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                        />
                        {formData.image && (
                            <div className="mt-2 relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={formData.image} alt="Preview" className="w-full h-full object-contain" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-melagri-primary text-white rounded-lg font-medium hover:bg-melagri-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Product"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
