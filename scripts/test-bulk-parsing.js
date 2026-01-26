
const XLSX = require('xlsx');
const path = require('path');

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

function convertToDirectDriveLink(url) {
    if (!url || !url.includes('drive.google.com')) return url;

    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
    }

    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }

    return url;
}

const filePath = path.join('c:', 'Users', 'Steve', 'OneDrive - House Of Procurement', 'Desktop', 'Documents', 'GitHub', 'Mel-Agro', 'excel', 'NEW LISTING PRODUCT1.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // NEW: Capture hyperlinks
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    if (worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
            headers.push(cell ? String(cell.v).trim() : `COL_${C}`);
        }

        jsonData.forEach((row, idx) => {
            const rowIdx = range.s.r + 1 + idx;
            headers.forEach((header, colIdx) => {
                const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                const cell = worksheet[cellAddress];
                if (cell && cell.l && cell.l.Target) {
                    row[header] = cell.l.Target;
                }
            });
        });
    }

    console.log(`--- Testing Parsing for ${jsonData.length} products ---\n`);

    const results = jsonData.slice(0, 5).map((row, index) => {
        const name = getRowValue(row, 'PRODUCT NAME', 'NAME', 'Product Name');

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

        let photo = getRowValue(row, 'PHOTO', 'IMAGE', 'Photo link');
        const rawPhoto = photo;
        if (photo) photo = convertToDirectDriveLink(String(photo));

        return {
            index: index + 1,
            name,
            rawPhoto,
            finalPhoto: photo,
            variantsCount: variants.length,
            firstVariantPrice: variants[0] ? variants[0].price : 0
        };
    });

    console.log(JSON.stringify(results, null, 2));
    console.log("\n--- Verification Complete ---");

} catch (error) {
    console.error("Error testing parsing:", error);
}
