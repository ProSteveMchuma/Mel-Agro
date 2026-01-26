
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('c:', 'Users', 'Steve', 'OneDrive - House Of Procurement', 'Desktop', 'Documents', 'GitHub', 'Mel-Agro', 'excel', 'NEW LISTING PRODUCT1.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Check for hyperlinks in the worksheet
    console.log("Hyperlinks present in worksheet:", !!worksheet['!links']);

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const colNames = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        colNames.push(cell ? cell.v : null);
    }

    const photoColIndex = colNames.findIndex(h => h && h.toLowerCase().includes('photo'));
    console.log("Photo link column index:", photoColIndex);

    if (photoColIndex !== -1) {
        const colLetter = XLSX.utils.encode_col(photoColIndex);
        console.log(`Inspecting column ${colLetter}...`);

        for (let R = range.s.r + 1; R <= range.s.r + 5; R++) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: photoColIndex });
            const cell = worksheet[cellAddress];
            if (cell) {
                console.log(`Cell ${cellAddress}:`);
                console.log("  Value (v):", cell.v);
                console.log("  Display (w):", cell.w);
                console.log("  Formula (f):", cell.f);
                if (cell.l) {
                    console.log("  Hyperlink (l):", cell.l.Target);
                } else {
                    console.log("  No 'l' property on cell.");
                }
            }
        }
    }

} catch (error) {
    console.error("Error reading excel:", error.message);
}
