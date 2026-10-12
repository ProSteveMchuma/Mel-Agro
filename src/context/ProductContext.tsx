"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { usePathname } from 'next/navigation';
import { Product } from '@/types';
import { applyLiveCatalogueProduct } from '@/lib/live-product';
import { needsLiveProductStream } from '@/lib/shop-listeners';
export type { Product };

interface ProductContextType {
    products: Product[];
    archivedProducts: Product[];
    addProduct: (product: Omit<Product, 'id'>, options?: { forceNewBrand?: boolean }) => Promise<void>;
    updateProduct: (id: number | string, updates: Partial<Product>, options?: { forceNewBrand?: boolean }) => Promise<void>;
    deleteProduct: (id: number | string) => Promise<void>;
    restoreProduct: (id: number | string) => Promise<void>;
    getProduct: (id: number | string) => Product | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
    const pathname = usePathname();


    useEffect(() => {
        if (!needsLiveProductStream(pathname)) {
            setProducts([]);
            setArchivedProducts([]);
            return;
        }
        // Admin home, order create, and product edit still read this list.
        // The shop itself uses the server catalogue and /api/catalogue/search.
        const q = query(collection(db, "products"), limit(500));
        const unsubscribe = onSnapshot(q, (snapshot: any) => {
            const productList: Product[] = [];
            snapshot.forEach((doc: any) => {
                const data = doc.data();
                productList.push({
                    ...data,
                    id: doc.id
                } as Product);
            });

            // Client-side sort by name, safely
            productList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            setProducts(productList.filter((product) => (product as Product & { archived?: boolean }).archived !== true));
            setArchivedProducts(productList.filter((product) => (product as Product & { archived?: boolean }).archived === true));
        }, (error: any) => {
            console.error("Error listening to products:", error);
        });

        return () => unsubscribe();
    }, [pathname]);

    const addProduct = async (productData: Omit<Product, 'id'>, options?: { forceNewBrand?: boolean }) => {
        try { await mutateProduct({ action: 'create', data: productData, forceNewBrand: options?.forceNewBrand === true }); } catch (error) {
            console.error("Error adding product context:", error);
            throw error;
        }
    };

    const updateProduct = async (id: number | string, updates: Partial<Product>, options?: { forceNewBrand?: boolean }) => {
        try { await mutateProduct({ action: 'update', productId: String(id), data: updates, forceNewBrand: options?.forceNewBrand === true }); } catch (error) {
            console.error("Error updating product:", error);
            throw error;
        }
    };

    const changeLifecycle = async (id: number | string, action: 'archive' | 'restore') => {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error('Admin session is unavailable.');
        const response = await fetch('/api/admin/products/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: String(id), action }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Could not ${action} product.`);
    };

    const mutateProduct = async (body: unknown) => {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error('Admin session is unavailable.');
        const response = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok) {
            const error = new Error(result.message || 'Could not save product.') as Error & {
                code?: string;
                suggestedBrand?: string;
            };
            error.code = result.code;
            error.suggestedBrand = result.suggestedBrand;
            throw error;
        }
        return result;
    };
    const deleteProduct = (id: number | string) => changeLifecycle(id, 'archive');
    const restoreProduct = (id: number | string) => changeLifecycle(id, 'restore');

    const getProduct = (id: number | string) => {
        return products.find((p: Product) => String(p.id) === String(id));
    };

    return (
        <ProductContext.Provider value={{ products, archivedProducts, addProduct, updateProduct, deleteProduct, restoreProduct, getProduct }}>
            {children}
        </ProductContext.Provider>
    );
}

export function useProducts() {
    const context = useContext(ProductContext);
    if (context === undefined) {
        throw new Error('useProducts must be used within a ProductProvider');
    }
    return context;
}

export function useLiveProduct<T extends { id?: string | number }>(seed: T): T {
    const { getProduct } = useProducts();
    return applyLiveCatalogueProduct(seed, seed.id != null ? getProduct(seed.id) : undefined);
}
