"use client";
import { useProducts } from "@/context/ProductContext";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import ProductForm from "@/components/admin/ProductForm";
import { Product } from "@/context/ProductContext";

export default function EditProductPage() {
    const { getProduct, updateProduct, products } = useProducts();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [product, setProduct] = useState<Product | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (products.length > 0) {
            const foundProduct = getProduct(id);
            if (foundProduct) {
                // Prepare initial data for the form, converting stockQuantity to string
                const initialFormData = {
                    ...foundProduct,
                    featured: foundProduct.featured || false
                };
                setProduct(initialFormData);
            }
            setIsLoading(false);
        }
    }, [products, id, getProduct]);

    const handleSubmit = async (data: Omit<Product, 'id'>) => {
        setIsSubmitting(true);
        try {
            await updateProduct(id, data);
            router.push('/dashboard/admin/products');
        } catch (error: any) {
            console.error("Failed to update product:", error);
            const errorMsg = error.code === 'permission-denied'
                ? "Permission Denied: You don't have authorization to edit products."
                : (error.message || "Please try again.");
            alert(`Failed to update product: ${errorMsg}`);
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading product...</div>;
    }

    if (!product) {
        return <div className="p-8 text-center text-red-500">Product not found.</div>;
    }

    return (
        <ProductForm
            title="Edit Product"
            initialData={product}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
        />
    );
}
