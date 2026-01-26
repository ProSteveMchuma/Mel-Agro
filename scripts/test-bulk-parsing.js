const XLSX = require('xlsx');
const path = require('path');

async function testUpload() {
    const filePath = path.join(process.cwd(), 'excel', 'Product List Pest control and crop protection.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows`);

    let count = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const row of data) {
        const name = row['PRODUCT NAME'];
        if (!name) {
            console.log(`Row ${count} skipped: No 'PRODUCT NAME'`);
            continue;
        }

        const priceStr = String(row['PRODUCT PRICE'] || "");
        if (!priceStr) {
            console.log(`Row ${count} (${name}) has no price`);
        }

        // Simulating the logic...
        count++;
        createdCount++; // Assuming all are new for this test

        if (count < 5) {
            console.log(`Row ${count}: ${name} | Price: ${priceStr} | Cat: ${row['CATEGORY']}`);
        }
    }

    console.log(`Summary: Total ${count}, Created ${createdCount}, Updated ${updatedCount}`);
}

testUpload();
