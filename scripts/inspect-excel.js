
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('c:', 'Users', 'Steve', 'OneDrive - House Of Procurement', 'Desktop', 'Documents', 'GitHub', 'Mel-Agro', 'excel', 'NEW LISTING PRODUCT1.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log("Folicur 250 EW (Index 1) data:", JSON.stringify(data[1], null, 2));
} catch (error) {
    console.error("Error reading excel:", error.message);
}
