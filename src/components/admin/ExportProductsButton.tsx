"use client";

import { useState, useRef, useEffect } from 'react';
import { getAllProducts } from '@/app/actions/bulkActions';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Product } from '@/types';

export default function ExportProductsButton() {
    const [isExporting, setIsExporting] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleExport = async (type: 'excel' | 'json') => {
        setIsExporting(true);
        setShowOptions(false);
        const loadingToast = toast.loading(`Generating ${type === 'excel' ? 'Excel catalog' : 'JSON backup'}...`);

        try {
            const result = await getAllProducts();

            if (result.success && result.products) {
                const products = result.products as Product[];
                const dateStr = new Date().toISOString().split('T')[0];

                if (type === 'excel') {
                    // Excel Export Logic
                    const exportData = products.map(p => {
                        const variantStr = p.variants && p.variants.length > 0
                            ? p.variants.map((v: any) => `${v.name} Kes ${v.price}`).join(', ')
                            : `Kes ${p.price}`;

                        return {
                            'PRODUCT CODE': p.productCode || p.id.toString().substring(0, 8),
                            'PRODUCT NAME': p.name,
                            'PRODUCT DISCRIPTION': p.description,
                            'SPECIFICATION': p.specification || "",
                            'HOW TO USE': p.howToUse || "",
                            'PRODUCT PRICE': variantStr,
                            'CATEGORY': p.category,
                            'SUB CATEGORY': p.subCategory || "",
                            'BRAND': p.brand || "MEL-AGRI",
                            'PHOTO': p.image
                        };
                    });

                    const worksheet = XLSX.utils.json_to_sheet(exportData);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
                    XLSX.writeFile(workbook, `Mel-Agri_Catalog_${dateStr}.xlsx`);

                } else {
                    // JSON Backup Logic
                    const jsonString = JSON.stringify(products, null, 2);
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Mel-Agri_Full_Backup_${dateStr}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }

                toast.success(`${type === 'excel' ? 'Catalog' : 'Backup'} exported successfully!`, { id: loadingToast });
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
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowOptions(!showOptions)}
                disabled={isExporting}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${isExporting
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-melagri-primary border border-melagri-primary/20 hover:bg-melagri-primary/5 shadow-melagri-primary/10"
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
                        Export / Backup
                        <svg className={`w-3 h-3 transition-transform ${showOptions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </>
                )}
            </button>

            {showOptions && !isExporting && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl bg-white border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                        <button
                            onClick={() => handleExport('excel')}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-semibold text-gray-900">Excel Catalog</div>
                                <div className="text-xs text-gray-500">For printing & sharing</div>
                            </div>
                        </button>
                        <button
                            onClick={() => handleExport('json')}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-semibold text-gray-900">Full JSON Backup</div>
                                <div className="text-xs text-gray-500">Complete data snapshot</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
