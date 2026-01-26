"use server";

import * as XLSX from 'xlsx';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { ProductVariant } from '@/types';

/**
 * Helper to get a value from a row using case-insensitive and trimmed keys
 */
function getRowValue(row: any, ...keys: string[]): any {
    const rowKeys = Object.keys(row);
    for (const targetKey of keys) {
        const normalizedTarget = targetKey.toLowerCase().trim();
        const foundKey = rowKeys.find(k => k.toLowerCase().trim() === normalizedTarget);
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
            return row[foundKey];
        }
    }
    return undefined;
}

export async function uploadProductsFromExcel(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, error: "No file provided" };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Processing ${data.length} rows from Excel`);

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
            const name = getRowValue(row, 'PRODUCT NAME', 'NAME');
            if (!name) {
                console.warn(`Row ${count} skipped: Missing name column`);
                continue;
            }

            const trimmedName = String(name).trim();
            const lowerName = trimmedName.toLowerCase();

            // 2. Parsing Price & Variants
            const rawPrice = getRowValue(row, 'PRODUCT PRICE', 'PRICE');
            const priceStr = String(rawPrice || "");
            const variantParts = priceStr.split(',').map(s => s.trim()).filter(Boolean);

            let basePrice = 0;
            const variants: ProductVariant[] = [];

            if (variantParts.length > 0) {
                variantParts.forEach((part, index) => {
                    const kesMatch = part.match(/Kes\s*([\d,.]+)/i);
                    const numMatch = part.match(/([\d,.]+)/);

                    const price = kesMatch
                        ? parseFloat(kesMatch[1].replace(/,/g, ''))
                        : (numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : 0);

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
            }

            // 3. Prepare Product Data
            const category = getRowValue(row, 'CATEGORY') || "Uncategorized";
            const subCategory = getRowValue(row, 'SUB CATEGORY') || "";
            const photo = getRowValue(row, 'PHOTO', 'IMAGE');

            const productData: any = {
                name: trimmedName,
                description: getRowValue(row, 'PRODUCT DISCRIPTION', 'DESCRIPTION', 'PRODUCT DESCRIPTION') || "",
                specification: getRowValue(row, 'SPECIFICATION') || "",
                howToUse: getRowValue(row, 'HOW TO USE', 'DIRECTIONS') || "",
                price: basePrice,
                category: category,
                subCategory: subCategory,
                brand: getRowValue(row, 'SUPPLIER', 'SUPPLIER ', 'BRAND') || "MEL-AGRI",
                image: photo && String(photo).startsWith('http') ? photo : "https://placehold.co/600x600?text=No+Image",
                inStock: true,
                stockQuantity: 100,
                lowStockThreshold: 10,
                variants: variants.length > 1 ? variants : [],
                tags: [category, subCategory].filter(Boolean).map(t => String(t)),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            };

            // 4. Intelligent Write (Update if exists, Set if new)
            if (existingProductsMap.has(lowerName)) {
                const docId = existingProductsMap.get(lowerName)!;
                const docRef = productsRef.doc(docId);
                batch.update(docRef, productData);
                updatedCount++;
            } else {
                const docRef = productsRef.doc();
                productData.createdAt = admin.firestore.FieldValue.serverTimestamp();
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
        console.log(`Bulk upload successful: ${count} total, ${createdCount} created, ${updatedCount} updated`);
        return { success: true, count, createdCount, updatedCount };

    } catch (error: any) {
        console.error("Bulk upload action error:", error);
        return { success: false, error: error.message || "An error occurred during upload" };
    }
}

