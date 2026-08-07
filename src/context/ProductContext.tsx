"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, limit } from 'firebase/firestore';
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
    const { user: authUser } = useAuth();
    const pathname = usePathname();


    useEffect(() => {
        const adminProductRoutes = ['/dashboard/admin', '/dashboard/admin/products', '/dashboard/admin/inventory', '/dashboard/admin/fulfillment', '/dashboard/admin/operations', '/dashboard/admin/messages', '/dashboard/admin/orders/create'];
        if (pathname.startsWith('/dashboard/admin') && !adminProductRoutes.some((route) => pathname === route || (route !== '/dashboard/admin' && pathname.startsWith(`${route}/`)))) {
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
        try {
            // Ensure numeric values are actually numbers and not NaN
            const product = {
                ...productData,
                price: Number(productData.price) || 0,
                stockQuantity: Number(productData.stockQuantity) || 0,
                lowStockThreshold: Number(productData.lowStockThreshold) || 10,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const docRef = await addDoc(collection(db, "products"), product);

            // Log Inventory History for the new product
            await addDoc(collection(db, "inventory_history"), {
                productId: docRef.id,
                productName: product.name,
                previousStock: 0,
                newStock: product.stockQuantity,
                change: product.stockQuantity,
                type: 'initial',
                updatedBy: authUser?.email || 'System',
                updatedAt: new Date().toISOString(),
                note: 'Product created'
            });
        } catch (error) {
            console.error("Error adding product context:", error);
            throw error;
        }
    };

    const updateProduct = async (id: number | string, updates: Partial<Product>) => {
        try {
            const productRef = doc(db, "products", String(id));
            const oldProduct = products.find((p: Product) => String(p.id) === String(id));

            const sanitizedUpdates = {
                ...updates,
                updatedAt: new Date().toISOString()
            };

            await updateDoc(productRef, sanitizedUpdates);

            try {
                // Log Inventory History if stock changed
                if (updates.stockQuantity !== undefined && oldProduct && updates.stockQuantity !== oldProduct.stockQuantity) {
                    await addDoc(collection(db, "inventory_history"), {
                        productId: String(id),
                        productName: oldProduct.name,
                        previousStock: oldProduct.stockQuantity,
                        newStock: updates.stockQuantity,
                        change: Number(updates.stockQuantity) - Number(oldProduct.stockQuantity),
                        type: 'adjustment',
                        updatedBy: authUser?.email || authUser?.phone || authUser?.uid || 'System',
                        updatedAt: new Date().toISOString()
                    });
                }
            } catch (historyError) {
                console.warn("Failed to log inventory history, but product update succeeded:", historyError);
                // We don't throw here to allow the main update to be considered "done"
            }
        } catch (error) {
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
