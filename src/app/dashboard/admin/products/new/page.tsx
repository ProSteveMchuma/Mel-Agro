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
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        await addProduct(data);
        router.push('/dashboard/admin/products');
    };

    return (
        <ProductForm
            title="Add New Product"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
        />
    );
}
