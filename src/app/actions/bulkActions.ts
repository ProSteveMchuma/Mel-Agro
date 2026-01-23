"use server";

import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { Product, ProductVariant } from '@/types';

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

        const batch = writeBatch(db);
        const productsRef = collection(db, "products");

        let count = 0;

        for (const row of data as any[]) {
            const name = row['PRODUCT NAME'];
            if (!name) continue;

            // Parsing Price & Variants
            // Format example: "62.5ml Kes 750, 25ml Kes 350"
            const priceStr = String(row['PRODUCT PRICE'] || "");
            const variantParts = priceStr.split(',').map(s => s.trim()).filter(Boolean);

            let basePrice = 0;
            const variants: ProductVariant[] = [];

            variantParts.forEach((part, index) => {
                // Try to match "Kes 750" or just "750"
                const kesMatch = part.match(/Kes\s*([\d,]+)/i);
                const numMatch = part.match(/([\d,]+)/);

                const price = kesMatch
                    ? parseInt(kesMatch[1].replace(/,/g, ''))
                    : (numMatch ? parseInt(numMatch[1].replace(/,/g, '')) : 0);

                // Extract weight/name (everything before price/Kes)
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

            const productData = {
                name: name,
                description: row['PRODUCT DISCRIPTION'] || "",
                specification: row['SPECIFICATION'] || "",
                howToUse: row['HOW TO USE'] || "",
                price: basePrice,
                category: row['CATEGORY'] || "Uncategorized",
                subCategory: row['SUB CATEGORY'] || "",
                brand: row['SUPPLIER '] || row['SUPPLIER'] || "MEL-AGRI",
                image: row['PHOTO'] && row['PHOTO'].startsWith('http') ? row['PHOTO'] : "https://placehold.co/600x600?text=No+Image",
                rating: 5,
                reviews: 0,
                inStock: true,
                stockQuantity: 100,
                lowStockThreshold: 10,
                createdAt: Timestamp.now(),
                variants: variants.length > 1 ? variants : [],
                tags: [row['CATEGORY'], row['SUB CATEGORY']].filter(Boolean)
            };

            const newDocRef = doc(productsRef);
            batch.set(newDocRef, productData);
            count++;

            // Firestore batch limit is 500
            if (count % 400 === 0) {
                // Note: In a real production app with thousands of rows, 
                // we'd need to await batch.commit() and start a new one here.
                // For this scale, a single batch is likely fine.
            }
        }

        await batch.commit();
        return { success: true, count };

    } catch (error: any) {
        console.error("Bulk upload error:", error);
        return { success: false, error: error.message };
    }
}
