const XLSX = require('xlsx');

const filePath = `c:\\Users\\Steve\\OneDrive - House Of Procurement\\Desktop\\Documents\\GitHub\\Mel-Agro\\excel\\Product List Pest control and crop protection.xlsx`;
try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length > 0) {
        console.log('--- HEADERS ---');
        data[0].forEach((h, i) => console.log(`${i}: ${h}`));
        console.log('--- SAMPLE ROW 1 ---');
        if (data[1]) {
            data[1].forEach((v, i) => console.log(`${i}: ${v}`));
        }
    } else {
        console.log('Empty sheet');
    }
} catch (e) {
    console.error('Error reading file:', e.message);
}
