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

/**
 * Intelligent string normalization to prevent duplicates from spacing/punctuation
 */
function normalizeProductField(val: any): string {
    if (!val) return "";
    return String(val)
        .trim()
        .replace(/[.,;:]+$/, "") // Remove trailing punctuation
        .trim();
}

/**
 * Converts a Google Drive sharing link to a direct view/download link
 */
function convertToDirectDriveLink(url: string): string {
    if (!url || !url.includes('drive.google.com')) return url;

    // Pattern for file links: /file/d/ID/view...
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
    }

    // Pattern for id=ID query param
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }

    return url;
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

            // sheet_to_json is fast, but doesn't include hyperlinks
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            // Enhance data with hyperlinks
            if (worksheet['!ref']) {
                const range = XLSX.utils.decode_range(worksheet['!ref']);
                // Map columns to keys
                const headers: string[] = [];
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
                    headers.push(cell ? String(cell.v).trim() : `COL_${C}`);
                }

                jsonData.forEach((row, idx) => {
                    const rowIdx = range.s.r + 1 + idx; // Adjust for header and 0-indexing
                    headers.forEach((header, colIdx) => {
                        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                        const cell = worksheet[cellAddress];
                        // If cell has a hyperlink, override the value in row
                        if (cell && cell.l && cell.l.Target) {
                            row[header] = cell.l.Target;
                        }
                    });
                });
            }

            console.log(`Read ${jsonData.length} rows from sheet: ${sheetName}`);
            allSheetData = [...allSheetData, ...jsonData];
        });

        console.log(`Processing ${allSheetData.length} total rows from ${workbook.SheetNames.length} sheets`);

        // 1. Fetch existing products for intelligent deduplication
        const existingSnapshot = await adminDb.collection('products').get();
        const skuMap = new Map<string, { id: string, data: any }>();
        const nameMap = new Map<string, { id: string, data: any }>();

        existingSnapshot.forEach(doc => {
            const pData = doc.data();
            if (pData.productCode) {
                skuMap.set(normalizeProductField(pData.productCode).toLowerCase(), { id: doc.id, data: pData });
            }
            if (pData.name) {
                nameMap.set(normalizeProductField(pData.name).toLowerCase(), { id: doc.id, data: pData });
            }
        });

        const batch = adminDb.batch();
        const productsRef = adminDb.collection("products");

        let totalProcessed = 0;
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const reportLogs: any[] = [];

        for (const row of allSheetData as any[]) {
            const name = getRowValue(row, 'PRODUCT NAME', 'NAME', 'Product Name');
            if (!name) continue;

            const trimmedName = String(name).trim();
            const lowerName = trimmedName.toLowerCase().trim();

            // 2. Parsing Price & Variants
            const rawPrice = getRowValue(row, 'PRODUCT PRICE', 'PRICE', 'Base Price (KES)') || "";
            const priceStr = String(rawPrice);
            const variants: ProductVariant[] = [];
            let basePrice = 0;

            const variantRegex = /(?:Kes|KES)?\s*([\d,]{2,10})\s*(?:\((.*?)\))?/gi;
            let match;
            let variantIndex = 0;
            const priceTokens = priceStr.split(',').map(s => s.trim());

            for (const token of priceTokens) {
                const innerMatch = /(?:Kes|KES)?\s*([\d,]{2,10})\s*(?:\((.*?)\))?/i.exec(token);
                if (innerMatch && innerMatch[1]) {
                    const cleanPrice = innerMatch[1].replace(/,/g, '');
                    const vPrice = parseFloat(cleanPrice);
                    if (!isNaN(vPrice)) {
                        let vName = (innerMatch[2] || "Standard").trim();
                        if (variantIndex === 0) basePrice = vPrice;
                        variants.push({
                            id: `v-${Date.now()}-${variantIndex}`,
                            name: vName,
                            price: vPrice,
                            stockQuantity: 100
                        });
                        variantIndex++;
                    }
                }
            }

            if (variants.length === 0 && !isNaN(parseFloat(priceStr.replace(/,/g, '')))) {
                basePrice = parseFloat(priceStr.replace(/,/g, ''));
                variants.push({ id: `v-${Date.now()}-0`, name: "Standard", price: basePrice, stockQuantity: 100 });
            }

            // 3. Metadata Extraction & Normalization
            const category = normalizeProductField(getRowValue(row, 'CATEGORY') || "Uncategorized");
            const subCategory = normalizeProductField(getRowValue(row, 'SUB CATEGORY', 'SUB-CATEGORY') || "");
            const brand = normalizeProductField(getRowValue(row, 'BRAND', 'MANUFACTURER', 'Brand') || "MEL-AGRI");
            const productCode = normalizeProductField(getRowValue(row, 'PRODUCT CODE', 'SKU', 'CODE') || "");

            // Image protection: Never extract image from Excel to avoid overwriting manual uploads
            let photo = "";

            const specData = getRowValue(row, 'SPECIFICATION', 'TECHNICAL SPECIFICATION', 'SPECS', 'Technical Specification');
            const specification = typeof specData === 'string' ? specData : (Array.isArray(specData) ? specData.join(', ') : "");

            let featuresCol = getRowValue(row, 'FEATURES', 'HIGHLIGHTS', 'KEY FEATURES', 'Features (One per line)');
            let features: string[] = [];
            if (featuresCol) {
                features = String(featuresCol).split(/[,\n]/).map(f => f.trim()).filter(Boolean);
            } else {
                const description = String(getRowValue(row, 'PRODUCT DISCRIPTION', 'DESCRIPTION', 'Product Description') || "");
                const bulletMatches = description.match(/[•*-]\s*(.*?)(?=\n|[•*-]|$)/g);
                if (bulletMatches) {
                    features = bulletMatches.map(m => m.replace(/^[•*-]\s*/, '').trim()).filter(f => f.length > 3);
                }
            }

            const newProductData: any = {
                name: trimmedName,
                description: getRowValue(row, 'PRODUCT DISCRIPTION', 'DESCRIPTION', 'PRODUCT DESCRIPTION', 'Product Description') || "",
                specification: specification,
                howToUse: getRowValue(row, 'HOW TO USE', 'DIRECTIONS', 'USE', 'How To Use / Guide', 'GUIDE', 'USAGE', 'INSTRUCTIONS', 'How to use') || "",
                features: features.length > 0 ? features : ["Quality Guaranteed", "Farmer Choice"],
                price: basePrice,
                category: category,
                subCategory: subCategory,
                brand: brand,
                productCode: productCode,
                image: (photo && (String(photo).startsWith('http') || String(photo).startsWith('/')))
                    ? photo
                    : "", // Only set image if it's a valid link
                inStock: true,
                stockQuantity: 100,
                lowStockThreshold: 10,
                variants: variants.length > 1 ? variants : [],
                weight: parseFloat(getRowValue(row, 'WEIGHT', 'ITEM WEIGHT', 'KG') || "0") || 0,
                tags: [category, subCategory, productCode].filter(Boolean).map(t => String(t)),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            };

            // 4. Multi-Stage Intelligent Deduplication (SKU First, then Normalized Name)
            let existing: { id: string, data: any } | undefined = undefined;

            if (productCode) {
                existing = skuMap.get(productCode.toLowerCase());
            }

            if (!existing) {
                existing = nameMap.get(normalizeProductField(trimmedName).toLowerCase());
            }

            if (existing) {
                const existingData = existing.data;

                // Protect Image: Never update image from Excel if it exists in DB
                if (existingData.image) {
                    newProductData.image = existingData.image;
                } else if (!newProductData.image || newProductData.image === "") {
                    // Fallback to placeholder ONLY if no image at all
                    newProductData.image = `https://placehold.co/600x600?text=${encodeURIComponent(trimmedName)}`;
                }

                // Deep Compare (Simplified for key fields)
                const hasChanged =
                    existingData.price !== newProductData.price ||
                    existingData.description !== newProductData.description ||
                    existingData.category !== newProductData.category ||
                    existingData.howToUse !== newProductData.howToUse ||
                    JSON.stringify(existingData.features) !== JSON.stringify(newProductData.features) ||
                    JSON.stringify(existingData.variants) !== JSON.stringify(newProductData.variants);

                if (hasChanged) {
                    const docRef = productsRef.doc(existing.id);
                    batch.update(docRef, newProductData);
                    updatedCount++;
                    reportLogs.push({ name: trimmedName, action: 'Updated', details: 'Changes detected in pricing or specs' });
                } else {
                    skippedCount++;
                    reportLogs.push({ name: trimmedName, action: 'Skipped', details: 'Data is already up to date' });
                }
            } else {
                // New Product
                if (!newProductData.image) {
                    newProductData.image = `https://placehold.co/600x600?text=${encodeURIComponent(trimmedName)}`;
                }
                const docRef = productsRef.doc();
                newProductData.createdAt = admin.firestore.FieldValue.serverTimestamp();
                newProductData.rating = 5;
                newProductData.reviews = 0;
                batch.set(docRef, newProductData);
                createdCount++;
                reportLogs.push({ name: trimmedName, action: 'Created', details: 'New product added to catalog' });
            }

            totalProcessed++;
            if (totalProcessed >= 490) break;
        }

        if (totalProcessed > 0) {
            await batch.commit();
        }

        console.log(`Bulk upload successful: ${totalProcessed} total, ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped`);
        return {
            success: true,
            summary: {
                total: totalProcessed,
                created: createdCount,
                updated: updatedCount,
                skipped: skippedCount
            },
            logs: reportLogs
        };

    } catch (error: any) {
        console.error("Bulk upload action error:", error);
        return { success: false, error: error.message || "An error occurred during upload" };
    }
}

export async function getAllProducts() {
    try {
        const snapshot = await adminDb.collection('products').get();
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return { success: true, products };
    } catch (error: any) {
        console.error("Error fetching products for export:", error);
        return { success: false, error: error.message };
    }
}
