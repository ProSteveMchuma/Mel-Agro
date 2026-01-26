const XLSX = require('xlsx');
const path = require('path');

async function discoverColumns() {
    const filePath = path.join(process.cwd(), 'excel', 'Product List Pest control and crop protection.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const mappedKeys = [
        'PRODUCT NAME', 'NAME',
        'PRODUCT DISCRIPTION', 'DESCRIPTION', 'PRODUCT DESCRIPTION',
        'VARIANTS (SIZE/WEIGHT)',
        'HOW TO USE', 'DIRECTIONS',
        'PRODUCT PRICE', 'PRICE',
        'CATEGORY', 'SUB CATEGORY',
        'SUPPLIER', 'SUPPLIER ', 'BRAND',
        'PHOTO', 'IMAGE'
    ].map(k => k.toLowerCase().trim());

    const unmappedKeysWithData = new Map();

    data.forEach(row => {
        Object.keys(row).forEach(k => {
            const normalized = k.toLowerCase().trim();
            if (!mappedKeys.includes(normalized)) {
                if (!unmappedKeysWithData.has(k)) {
                    unmappedKeysWithData.set(k, []);
                }
                if (row[k]) unmappedKeysWithData.get(k).push(row[k]);
            }
        });
    });

    console.log('--- UNMAPPED COLUMNS WITH DATA ---');
    unmappedKeysWithData.forEach((samples, key) => {
        if (samples.length > 0) {
            console.log(`Column: "${key}" (${samples.length} rows have data)`);
            console.log(`Sample: ${String(samples[0]).substring(0, 100)}...`);
        }
    });
}

discoverColumns();
