"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { products as MOCK_PRODUCTS } from '@/lib/mockData';

import { Product } from '@/types';

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

    const seedProducts = async () => {
        console.log("Starting seedProducts...");
        try {
            for (const p of MOCK_PRODUCTS) {
                console.log("Adding product:", p.name);
                const { id, ...rest } = p;
                await addDoc(collection(db, "products"), rest);
            }
            console.log("Seeding complete.");
        } catch (e) {
            console.error("Error seeding products:", e);
        }
    };

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

            // Client-side sort by name
            productList.sort((a, b) => a.name.localeCompare(b.name));

            if (productList.length === 0 && !loading) {
                // Only seed if we're sure it's empty and not just initial load
                // Actually, onSnapshot fires immediately with empty if empty.
                // We should be careful not to infinite loop seeding.
                // For now, let's assume if it's empty we might need to seed, but let's do it only once or check a flag.
                // To be safe, let's just log it. Seeding should be manual or handled better.
                console.log("No products found in Firestore.");
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

    const addProduct = async (product: Omit<Product, 'id'>) => {
        await addDoc(collection(db, "products"), product);
    };

    const updateProduct = async (id: number | string, updates: Partial<Product>) => {
        try {
            const productRef = doc(db, "products", String(id));
            const oldProduct = products.find((p: Product) => String(p.id) === String(id));

            await updateDoc(productRef, updates);

            // Log Inventory History if stock changed
            if (updates.stockQuantity !== undefined && oldProduct && updates.stockQuantity !== oldProduct.stockQuantity) {
                await addDoc(collection(db, "inventory_history"), {
                    productId: String(id),
                    productName: oldProduct.name,
                    previousStock: oldProduct.stockQuantity,
                    newStock: updates.stockQuantity,
                    change: updates.stockQuantity - oldProduct.stockQuantity,
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
