"use client";

import { useState } from 'react';
import { getAllProducts } from '@/app/actions/bulkActions';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Product } from '@/types';

export default function ExportProductsButton() {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        const loadingToast = toast.loading('Generating Excel catalog...');

        try {
            const result = await getAllProducts();

            if (result.success && result.products) {
                // Transform products for Excel
                const products = result.products as Product[];
                const exportData = products.map(p => {
                    // Format variants back to "Name Kes Price" string
                    const variantStr = p.variants && p.variants.length > 0
                        ? p.variants.map((v: any) => `${v.name} Kes ${v.price}`).join(', ')
                        : `Kes ${p.price}`;

                    return {
                        'PRODUCT CODE': p.id.toString().substring(0, 8),
                        'PRODUCT NAME': p.name,
                        'PRODUCT DISCRIPTION': p.description,
                        'SPECIFICATION': p.specification || "",
                        'HOW TO USE': p.howToUse || "",
                        'PRODUCT PRICE': variantStr,
                        'CATEGORY': p.category,
                        'SUB CATEGORY': p.subCategory || "",
                        'SUPPLIER ': p.brand || "MEL-AGRI",
                        'PHOTO': p.image
                    };
                });

                // Create Workbook
                const worksheet = XLSX.utils.json_to_sheet(exportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

                // Download
                XLSX.writeFile(workbook, `MelAgro_Catalog_${new Date().toISOString().split('T')[0]}.xlsx`);

                toast.success('Catalog exported successfully!', { id: loadingToast });
            } else {
                toast.error(`Export failed: ${result.error}`, { id: loadingToast });
            }
        } catch (error) {
            console.error('Export error:', error);
            toast.error('An unexpected error occurred during export', { id: loadingToast });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${isExporting
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-melagro-primary border border-melagro-primary/20 hover:bg-melagro-primary/5 shadow-melagro-primary/10"
                }`}
        >
            {isExporting ? (
                <>
                    <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Catalog
                </>
            )}
        </button>
    );
}
