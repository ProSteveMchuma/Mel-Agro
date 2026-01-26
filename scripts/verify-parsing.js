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

async function verifyParsing() {
    const filePath = path.join(process.cwd(), 'excel', 'Product List Pest control and crop protection.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Verifying ${data.length} rows`);

    data.slice(0, 3).forEach((row, i) => {
        const name = getRowValue(row, 'PRODUCT NAME', 'NAME');
        const priceStr = String(getRowValue(row, 'PRODUCT PRICE', 'PRICE') || "");
        const category = getRowValue(row, 'CATEGORY');
        const description = getRowValue(row, 'PRODUCT DISCRIPTION', 'DESCRIPTION');
        const supplier = getRowValue(row, 'SUPPLIER', 'SUPPLIER ');

        console.log(`--- Row ${i + 1} ---`);
        console.log(`Name: ${name}`);
        console.log(`Price Str: ${priceStr}`);
        console.log(`Category: ${category}`);
        console.log(`Supplier: ${supplier}`);
        console.log(`Description (short): ${description?.substring(0, 50)}...`);

        // Test price parsing
        const variantParts = priceStr.split(',').map(s => s.trim()).filter(Boolean);
        variantParts.forEach((part, index) => {
            const kesMatch = part.match(/Kes\s*([\d,.]+)/i);
            const numMatch = part.match(/([\d,.]+)/);
            const price = kesMatch
                ? parseFloat(kesMatch[1].replace(/,/g, ''))
                : (numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : 0);
            console.log(`  Variant ${index}: ${price}`);
        });
    });
}

verifyParsing();
