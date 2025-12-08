"use client";
import { useProducts } from "@/context/ProductContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ProductForm from "@/components/admin/ProductForm";
import { Product } from "@/lib/mockData";

export default function AddProductPage() {
    const { addProduct } = useProducts();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: Omit<Product, 'id'>) => {
        setIsSubmitting(true);
        try {
            await addProduct(data);
            // We can assume success if no error thrown
            alert("Product added successfully!");
            router.push('/dashboard/admin/products');
        } catch (error: any) {
            console.error("Error adding product:", error);
            if (error.code === 'permission-denied') {
                alert("Error: You do not have permission to add products.");
            } else {
                alert(`Failed to add product: ${error.message}`);
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
