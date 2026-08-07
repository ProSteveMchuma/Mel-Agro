"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { usePathname } from 'next/navigation';
import { Product } from '@/types';
export type { Product };

interface ProductContextType {
    products: Product[];
    archivedProducts: Product[];
    addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
    updateProduct: (id: number | string, updates: Partial<Product>) => Promise<void>;
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
        const adminProductRoutes = ['/dashboard/admin', '/dashboard/admin/products', '/dashboard/admin/inventory', '/dashboard/admin/fulfillment', '/dashboard/admin/operations', '/dashboard/admin/messages', '/dashboard/admin/orders/create'];
        const usesServerProductFeed = pathname === '/dashboard/admin/products' || pathname === '/dashboard/admin/inventory' || pathname === '/dashboard/admin/fulfillment' || pathname === '/dashboard/admin/messages';
        if (usesServerProductFeed || (pathname.startsWith('/dashboard/admin') && !adminProductRoutes.some((route) => pathname === route || (route !== '/dashboard/admin' && pathname.startsWith(`${route}/`))))) {
            setProducts([]); setArchivedProducts([]); return;
        }
        // Cap the live stream to keep first-paint payload bounded. Stores beyond this size
        // should rely on the paginated /products page (which uses getProductsPage) rather
        // than the global context. The catalog page itself already paginates server-side.
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

    const addProduct = async (productData: Omit<Product, 'id'>) => {
        try { await mutateProduct({ action: 'create', data: productData }); } catch (error) {
            console.error("Error adding product context:", error);
            throw error;
        }
    };

    const updateProduct = async (id: number | string, updates: Partial<Product>) => {
        try { await mutateProduct({ action: 'update', productId: String(id), data: updates }); } catch (error) {
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

    const mutateProduct = async (body: unknown) => { const token = await getAuth().currentUser?.getIdToken(); if (!token) throw new Error('Admin session is unavailable.'); const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Could not save product.'); return result; };
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
