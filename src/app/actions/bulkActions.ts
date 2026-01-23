"use server";

import * as XLSX from 'xlsx';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { ProductVariant } from '@/types';

export async function uploadProductsFromExcel(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, error: "No file provided" };
    }

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        // 1. Fetch existing products for intelligent deduplication
        const existingSnapshot = await adminDb.collection('products').get();
        const existingProductsMap = new Map<string, string>(); // name.toLowerCase() -> id
        existingSnapshot.forEach(doc => {
            const pData = doc.data();
            if (pData.name) {
                existingProductsMap.set(String(pData.name).toLowerCase().trim(), doc.id);
            }
        });

        const batch = adminDb.batch();
        const productsRef = adminDb.collection("products");

        let count = 0;
        let createdCount = 0;
        let updatedCount = 0;

        for (const row of data as any[]) {
            const name = row['PRODUCT NAME'];
            if (!name) continue;

            const trimmedName = String(name).trim();
            const lowerName = trimmedName.toLowerCase();

            // 2. Parsing Price & Variants
            const priceStr = String(row['PRODUCT PRICE'] || "");
            const variantParts = priceStr.split(',').map(s => s.trim()).filter(Boolean);

            let basePrice = 0;
            const variants: ProductVariant[] = [];

            variantParts.forEach((part, index) => {
                const kesMatch = part.match(/Kes\s*([\d,]+)/i);
                const numMatch = part.match(/([\d,]+)/);

                const price = kesMatch
                    ? parseInt(kesMatch[1].replace(/,/g, ''))
                    : (numMatch ? parseInt(numMatch[1].replace(/,/g, '')) : 0);

                let variantName = part.split(/Kes/i)[0].trim();
                if ((!variantName || variantName === numMatch?.[0]) && numMatch) {
                    variantName = part.replace(numMatch[0], '').trim();
                }
                if (!variantName || variantName === numMatch?.[0]) variantName = "Standard";

                if (index === 0) basePrice = price;

                variants.push({
                    id: `v-${Date.now()}-${index}`,
                    name: variantName,
                    price: price,
                    stockQuantity: 100
                });
            });

            // 3. Prepare Product Data
            const productData: any = {
                name: trimmedName,
                description: row['PRODUCT DISCRIPTION'] || "",
                specification: row['SPECIFICATION'] || "",
                howToUse: row['HOW TO USE'] || "",
                price: basePrice,
                category: row['CATEGORY'] || "Uncategorized",
                subCategory: row['SUB CATEGORY'] || "",
                brand: row['SUPPLIER '] || row['SUPPLIER'] || "MEL-AGRI",
                image: row['PHOTO'] && String(row['PHOTO']).startsWith('http') ? row['PHOTO'] : "https://placehold.co/600x600?text=No+Image",
                inStock: true,
                stockQuantity: 100,
                lowStockThreshold: 10,
                variants: variants.length > 1 ? variants : [],
                tags: [row['CATEGORY'], row['SUB CATEGORY']].filter(Boolean).map(t => String(t)),
                lastUpdated: admin.firestore.Timestamp.now()
            };

            // 4. Intelligent Write (Update if exists, Set if new)
            if (existingProductsMap.has(lowerName)) {
                const docId = existingProductsMap.get(lowerName)!;
                const docRef = productsRef.doc(docId);
                batch.update(docRef, productData);
                updatedCount++;
            } else {
                const docRef = productsRef.doc();
                productData.createdAt = admin.firestore.Timestamp.now();
                productData.rating = 5;
                productData.reviews = 0;
                batch.set(docRef, productData);
                createdCount++;
            }

            count++;

            // Firestore Batch Limit is 500. For safety we only process up to 490 per action call.
            if (count >= 490) break;
        }

        await batch.commit();
        return { success: true, count, createdCount, updatedCount };

    } catch (error: any) {
        console.error("Bulk upload error:", error);
        return { success: false, error: error.message };
    }
}
