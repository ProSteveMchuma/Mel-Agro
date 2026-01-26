
const XLSX = require('xlsx');
const path = require('path');

// Replicating the logic from bulkActions.ts for testing
function getRowValue(row, ...keys) {
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

function normalizeProductField(val) {
    if (!val) return "";
    return String(val)
        .trim()
        .replace(/[.,;:]+$/, "")
        .trim();
}

const filePath = path.join('c:', 'Users', 'Steve', 'OneDrive - House Of Procurement', 'Desktop', 'Documents', 'GitHub', 'Mel-Agro', 'excel', 'NEW LISTING PRODUCT1.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const allSheetData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`--- Testing Parsing for ${allSheetData.length} products ---\n`);

    const results = allSheetData.slice(0, 3).map((row, index) => {
        const name = getRowValue(row, 'PRODUCT NAME', 'NAME', 'Product Name');
        const trimmedName = String(name || "").trim();

        const rawPrice = getRowValue(row, 'PRODUCT PRICE', 'PRICE', 'Base Price (KES)') || "";
        const priceStr = String(rawPrice).trim();
        const variants = [];
        let basePrice = 0;

        const priceTokens = priceStr.split(',').map(s => s.trim());
        let variantIndex = 0;

        for (const token of priceTokens) {
            const innerMatch = /(?:Kes|KES)?\s*([\d,]{2,10})\s*(?:\((.*?)\))?/i.exec(token);
            if (innerMatch && innerMatch[1]) {
                const cleanPrice = innerMatch[1].replace(/,/g, '');
                const vPrice = parseFloat(cleanPrice);
                if (!isNaN(vPrice)) {
                    let vName = (innerMatch[2] || "Standard").trim();
                    if (variantIndex === 0) basePrice = vPrice;
                    variants.push({ name: vName, price: vPrice });
                    variantIndex++;
                }
            }
        }

        const category = normalizeProductField(getRowValue(row, 'CATEGORY') || "Uncategorized");
        const brand = normalizeProductField(getRowValue(row, 'BRAND', 'MANUFACTURER', 'Brand') || "MEL-AGRI");
        const photo = getRowValue(row, 'PHOTO', 'IMAGE', 'Photo link');
        const specData = getRowValue(row, 'SPECIFICATION', 'TECHNICAL SPECIFICATION', 'SPECS', 'Technical Specification');
        const howToUse = getRowValue(row, 'HOW TO USE', 'DIRECTIONS', 'USE', 'How To Use / Guide');

        let featuresCol = getRowValue(row, 'FEATURES', 'HIGHLIGHTS', 'KEY FEATURES', 'Features (One per line)');
        let features = [];
        if (featuresCol) {
            features = String(featuresCol).split(/[,\n]/).map(f => f.trim()).filter(Boolean);
        }

        return {
            index: index + 1,
            name: trimmedName,
            basePrice,
            variants,
            category,
            brand,
            photo,
            featuresCount: features.length,
            spec: specData ? (specData.substring(0, 50) + "...") : "None",
            howToUse: howToUse ? (howToUse.substring(0, 50) + "...") : "None"
        };
    });

    console.log(JSON.stringify(results, null, 2));
    console.log("\n--- Verification Complete ---");

} catch (error) {
    console.error("Error testing parsing:", error);
}
