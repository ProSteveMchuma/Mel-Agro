"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { Product } from '@/types';
export type { Product };

interface ProductContextType {
    products: Product[];
    addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
    updateProduct: (id: number | string, updates: Partial<Product>) => Promise<void>;
    deleteProduct: (id: number | string) => Promise<void>;
    getProduct: (id: number | string) => Product | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: authUser } = useAuth();


    useEffect(() => {
        const q = query(collection(db, "products"));
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

            if (productList.length === 0 && !loading) {
                // Only seed if we're sure it's empty and not just initial load
                // Actually, onSnapshot fires immediately with empty if empty.
                // We should be careful not to infinite loop seeding.
                // For now, let's assume if it's empty we might need to seed, but let's do it only once or check a flag.
                // To be safe, just log in debug mode. Seeding should be manual or handled better.
            } else {
                setProducts(productList);
            }
            setLoading(false);
        }, (error: any) => {
            console.error("Error listening to products:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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

            // Log Inventory History if stock changed
            if (updates.stockQuantity !== undefined && oldProduct && updates.stockQuantity !== oldProduct.stockQuantity) {
                await addDoc(collection(db, "inventory_history"), {
                    productId: String(id),
                    productName: oldProduct.name,
                    previousStock: oldProduct.stockQuantity,
                    newStock: updates.stockQuantity,
                    change: Number(updates.stockQuantity) - Number(oldProduct.stockQuantity),
                    type: 'adjustment',
                    updatedBy: authUser?.email || 'System',
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error("Error updating product:", error);
            throw error;
        }
    };

    const deleteProduct = async (id: number | string) => {
        const productRef = doc(db, "products", String(id));
        await deleteDoc(productRef);
    };

    const getProduct = (id: number | string) => {
        return products.find((p: Product) => String(p.id) === String(id));
    };

    return (
        <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, getProduct }}>
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
