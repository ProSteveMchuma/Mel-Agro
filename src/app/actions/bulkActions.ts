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
        console.log("Bulk upload action started");
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        let allSheetData: any[] = [];
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            console.log(`Read ${data.length} rows from sheet: ${sheetName}`);
            allSheetData = [...allSheetData, ...data];
        });

        console.log(`Processing ${allSheetData.length} total rows from ${workbook.SheetNames.length} sheets`);

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

        for (const row of allSheetData as any[]) {
            const name = getRowValue(row, 'PRODUCT NAME', 'NAME');
            if (!name) {
                console.warn(`Row ${count} skipped: Missing name column`);
                continue;
            }

            const trimmedName = String(name).trim();
            const lowerName = trimmedName.toLowerCase();

            // 2. Parsing Price & Variants
            const rawPrice = getRowValue(row, 'PRODUCT PRICE', 'PRICE') || "";
            const priceStr = String(rawPrice);
            const variants: ProductVariant[] = [];
            let basePrice = 0;

            const variantRegex = /(.*?)(?:Kes|KES)\s*([\d,.]+)/g;
            let match;
            let variantIndex = 0;
            while ((match = variantRegex.exec(priceStr)) !== null) {
                const rawVName = match[1].trim();
                const vPrice = parseFloat(match[2].replace(/,/g, ''));
                let vName = rawVName.split(',').pop()?.trim().replace(/:$/, '') || "Standard";
                if (!vName || vName.length > 30) vName = "Standard";
                if (variantIndex === 0) basePrice = vPrice;
                variants.push({ id: `v-${Date.now()}-${variantIndex}`, name: vName, price: vPrice, stockQuantity: 100 });
                variantIndex++;
            }

            if (variants.length === 0 && !isNaN(parseFloat(priceStr.replace(/,/g, '')))) {
                basePrice = parseFloat(priceStr.replace(/,/g, ''));
                variants.push({ id: `v-${Date.now()}-0`, name: "Standard", price: basePrice, stockQuantity: 100 });
            }

            // 3. Metadata Extraction
            const category = getRowValue(row, 'CATEGORY') || "Uncategorized";
            const subCategory = getRowValue(row, 'SUB CATEGORY', 'SUB-CATEGORY') || "";

            let photo = getRowValue(row, 'PHOTO', 'IMAGE');
            if (!photo || (typeof photo === 'string' && !photo.match(/\.(jpg|jpeg|png|webp|gif)$/i))) {
                const possiblePath = Object.values(row).find(val =>
                    typeof val === 'string' && (val.includes('\\') || val.includes('/') || val.match(/\.(jpg|jpeg|png|webp)$/i))
                );
                if (possiblePath) photo = String(possiblePath);
            }

            const specData = getRowValue(row, 'SPECIFICATION', 'TECHNICAL SPECIFICATION', 'SPECS');
            const specification = typeof specData === 'string' ? specData : (Array.isArray(specData) ? specData.join(', ') : "");

            let featuresCol = getRowValue(row, 'FEATURES', 'HIGHLIGHTS', 'KEY FEATURES');
            let features: string[] = [];
            if (featuresCol) {
                features = String(featuresCol).split(/[,\n]/).map(f => f.trim()).filter(Boolean);
            } else {
                const description = String(getRowValue(row, 'PRODUCT DISCRIPTION', 'DESCRIPTION') || "");
                const bulletMatches = description.match(/[•*-]\s*(.*?)(?=\n|[•*-]|$)/g);
                if (bulletMatches) {
                    features = bulletMatches.map(m => m.replace(/^[•*-]\s*/, '').trim()).filter(f => f.length > 3);
                }
            }

            const productData: any = {
                name: trimmedName,
                description: getRowValue(row, 'PRODUCT DISCRIPTION', 'DESCRIPTION', 'PRODUCT DESCRIPTION') || "",
                specification: specification,
                howToUse: getRowValue(row, 'HOW TO USE', 'DIRECTIONS', 'USE') || "",
                features: features.length > 0 ? features : ["Quality Guaranteed", "Farmer Choice"],
                price: basePrice,
                category: category,
                subCategory: subCategory,
                brand: getRowValue(row, 'SUPPLIER', 'SUPPLIER ', 'BRAND', 'MANUFACTURER') || "MEL-AGRI",
                image: (photo && (String(photo).startsWith('http') || String(photo).startsWith('/')))
                    ? photo
                    : `https://placehold.co/600x600?text=${encodeURIComponent(trimmedName)}`,
                inStock: true,
                stockQuantity: 100,
                lowStockThreshold: 10,
                variants: variants.length > 1 ? variants : [],
                tags: [category, subCategory, String(getRowValue(row, 'PRODUCT CODE') || "")].filter(Boolean).map(t => String(t)),
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

