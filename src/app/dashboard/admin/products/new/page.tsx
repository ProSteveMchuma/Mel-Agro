"use client";
import { useProducts } from "@/context/ProductContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";
import ProductForm from "@/components/admin/ProductForm";
import { Product } from "@/types";

export default function AddProductPage() {
    const { addProduct } = useProducts();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: Omit<Product, 'id'>, options?: { forceNewBrand?: boolean }) => {
        setIsSubmitting(true);
        const t = toast.loading('Saving product…');
        try {
            await addProduct(data, options);
            toast.success('Product added', { id: t });
            router.push('/dashboard/admin/products');
        } catch (error: any) {
            console.error("Error adding product:", error);
            if (error.code === 'BRAND_NEAR_DUPLICATE') {
                toast.dismiss(t);
                throw error;
            }
            if (error.code === 'permission-denied') {
                toast.error('You do not have permission to add products.', { id: t });
            } else {
                toast.error(error?.message || 'Failed to add product', { id: t });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ProductForm
            title="Add New Product"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
        />
    );
}
