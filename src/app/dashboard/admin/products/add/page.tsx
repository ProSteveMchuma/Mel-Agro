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
        stock: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
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

            await addProduct({
                name: formData.name,
                price: Number(formData.price),
                category: formData.category,
                description: formData.description,
                image: imageUrl,
                inStock: Number(formData.stock) > 0,
                stockQuantity: Number(formData.stock),
                lowStockThreshold: 10,
                rating: 0,
                reviews: 0
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
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagro-primary/50 outline-none"
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
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                        <input
                            type="number"
                            name="stock"
                            required
                            value={formData.stock}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                    >
                        <option value="Fertilizers">Fertilizers</option>
                        <option value="Seeds">Seeds</option>
                        <option value="Crop Protection">Crop Protection</option>
                        <option value="Animal Feeds">Animal Feeds</option>
                        <option value="Tools">Tools</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        name="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                    <div className="space-y-2">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-melagro-primary/10 file:text-melagro-primary hover:file:bg-melagro-primary/20"
                        />
                        <p className="text-xs text-gray-500">Or use an external URL:</p>
                        <input
                            type="text"
                            name="image"
                            placeholder="https://example.com/image.jpg"
                            value={formData.image}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                        />
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
                        className="px-6 py-2 bg-melagro-primary text-white rounded-lg font-medium hover:bg-melagro-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
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
