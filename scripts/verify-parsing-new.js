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

    console.log(`Verifying ${data.length} rows with NEW logic`);

    data.slice(0, 5).forEach((row, i) => {
        const name = getRowValue(row, 'PRODUCT NAME', 'NAME');
        const priceStr = String(getRowValue(row, 'PRODUCT PRICE', 'PRICE') || "");

        const variants = [];
        let basePrice = 0;
        const variantRegex = /(.*?)(?:Kes|KES)\s*([\d,.]+)/g;
        let match;
        let variantIndex = 0;
        while ((match = variantRegex.exec(priceStr)) !== null) {
            const rawVName = match[1].trim();
            const vPrice = parseFloat(match[2].replace(/,/g, ''));
            let vName = rawVName.split(',').pop()?.trim() || "Standard";
            if (!vName || vName.length > 20) vName = "Standard";
            if (variantIndex === 0) basePrice = vPrice;
            variants.push({ name: vName, price: vPrice });
            variantIndex++;
        }

        let photo = getRowValue(row, 'PHOTO', 'IMAGE');
        if (!photo) {
            const possiblePath = Object.values(row).find(val =>
                typeof val === 'string' && (val.includes('\\') || val.includes('/') || val.match(/\.(jpg|jpeg|png|webp)$/i))
            );
            if (possiblePath) photo = possiblePath;
        }

        console.log(`--- Row ${i + 1}: ${name} ---`);
        console.log(`Price Str: "${priceStr}"`);
        console.log(`Variants Found: ${variants.length}`);
        variants.forEach(v => console.log(`  - ${v.name}: ${v.price}`));
        console.log(`Photo: ${photo || 'MISSING'}`);
    });
}

verifyParsing();
