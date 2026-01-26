const { getDeliveryCost } = require('../src/lib/delivery');

console.log("=== MEL-AGRO DELIVERY LOGIC VERIFICATION ===");

const testCases = [
    { county: "Nairobi", weight: 2, total: 5000, expected: 200 },
    { county: "Mombasa", weight: 5, total: 3000, expected: 600 },
    { county: "Nairobi", weight: 20, total: 5000, expected: 200 + (5 * 35) }, // 200 base + 5kg over 15kg * 35/kg
    { county: "Kisumu", weight: 25, total: 1000, expected: 550 + (10 * 35) }, // 550 base + 10kg over 15kg
    { county: "Nairobi", weight: 5, total: 12000, expected: 0 }, // Free shipping (Nairobi)
    { county: "Mombasa", weight: 20, total: 15000, expected: 600 + (5 * 35) }, // NOT Free (too heavy)
];

testCases.forEach((tc, i) => {
    const result = getDeliveryCost(tc.county, tc.weight, tc.total);
    const pass = result.cost === tc.expected;
    console.log(`Test ${i + 1}: ${tc.county} (${tc.weight}kg, KES ${tc.total}) -> Result: KES ${result.cost} | Expected: KES ${tc.expected} | ${pass ? 'PASS' : 'FAIL'}`);
    console.log(`   Reason: ${result.reason}`);
});

process.exit(0);
