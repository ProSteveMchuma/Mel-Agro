const XLSX = require('xlsx');
const path = require('path');

async function analyzeExcel() {
    const filePath = path.join(process.cwd(), 'excel', 'Product List Pest control and crop protection.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Analyzing ${data.length} rows...`);

    const allKeys = new Set();
    data.forEach(row => {
        Object.keys(row).forEach(k => allKeys.add(k));
    });

    console.log('--- ALL DETECTED HEADERS ---');
    console.log(Array.from(allKeys));
    console.log('----------------------------');

    console.log('--- SAMPLE ROW 1 (JSON) ---');
    console.log(JSON.stringify(data[0], null, 2));

    console.log('--- RAW CELLS (First 5 Rows) ---');
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let r = 0; r <= 5; r++) {
        let rowStr = `Row ${r}: `;
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
            rowStr += `[${cell ? cell.v : 'EMPTY'}] `;
        }
        console.log(rowStr);
    }
}

analyzeExcel();
