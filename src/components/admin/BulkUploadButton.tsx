"use client";

import { useState, useRef } from 'react';
import { uploadProductsFromExcel } from '@/app/actions/bulkActions';
import { toast } from 'react-hot-toast';

export default function BulkUploadButton() {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input so same file can be uploaded again if needed
        e.target.value = '';

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        const loadingToast = toast.loading('Processing Excel file...');

        try {
            const result = await uploadProductsFromExcel(formData);

            if (result.success && result.summary && result.logs) {
                toast.success(
                    `Done! Created: ${result.summary.created}, Updated: ${result.summary.updated}`,
                    { id: loadingToast, duration: 2000 }
                );

                // Generate PDF Report
                try {
                    const { default: jsPDF } = await import('jspdf');
                    const { default: autoTable } = await import('jspdf-autotable');

                    const doc = new jsPDF();

                    // Header
                    doc.setFontSize(20);
                    doc.setTextColor(34, 197, 94); // Mel-Agri Green
                    doc.text('MEL-AGRI Bulk Upload Report', 14, 22);

                    doc.setFontSize(10);
                    doc.setTextColor(100);
                    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 30);

                    // Summary Table
                    autoTable(doc, {
                        startY: 35,
                        head: [['Metric', 'Count']],
                        body: [
                            ['Total Processed', result.summary.total],
                            ['New Products Created', result.summary.created],
                            ['Existing Products Updated', result.summary.updated],
                            ['Skipped (Up to Date)', result.summary.skipped],
                        ],
                        theme: 'striped',
                        headStyles: { fillColor: [34, 197, 94] }
                    });

                    // Details Table
                    autoTable(doc, {
                        startY: (doc as any).lastAutoTable.finalY + 10,
                        head: [['Product Name', 'Action', 'Status Details']],
                        body: result.logs.map((log: any) => [log.name, log.action, log.details]),
                        styles: { fontSize: 8 },
                        headStyles: { fillColor: [75, 85, 99] }
                    });

                    doc.save(`Mel-Agri_Upload_Report_${Date.now()}.pdf`);
                } catch (pdfErr) {
                    console.error('PDF Generation failed:', pdfErr);
                    toast.error('Upload succeeded, but PDF report failed to generate.');
                }

                // Refresh the page to show new products
                setTimeout(() => window.location.reload(), 3000);
            } else {
                toast.error(`Upload failed: ${result.success ? "Summary missing" : result.error}`, { id: loadingToast });
            }
        } catch (error) {
            toast.error('An unexpected error occurred', { id: loadingToast });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${isUploading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-900 border border-gray-200 hover:border-green-500 hover:text-green-600 shadow-gray-200/50"
                    }`}
            >
                {isUploading ? (
                    <>
                        <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Bulk Upload
                    </>
                )}
            </button>
        </div>
    );
}
