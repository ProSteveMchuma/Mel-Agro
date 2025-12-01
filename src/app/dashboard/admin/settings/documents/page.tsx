"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";
import { InvoiceTemplate } from "@/components/documents/InvoiceTemplate";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Mock Order for Preview
const mockOrder: any = {
    id: "ORD-PREVIEW-123",
    date: new Date().toISOString(),
    userId: "USER-123",
    userEmail: "customer@example.com",
    status: "Delivered",
    total: 4500,
    shippingAddress: {
        details: "123 Farm Road, Nairobi",
        county: "Nairobi"
    },
    items: [
        { name: "DAP Fertilizer", quantity: 1, price: 3500 },
        { name: "Vegetable Seeds", quantity: 2, price: 500 }
    ]
};

export default function DocumentSettingsPage() {
    const { general } = useSettings();
    const [activeTemplate, setActiveTemplate] = useState("invoice");
    const [saving, setSaving] = useState(false);

    // Template Settings State
    const [templateSettings, setTemplateSettings] = useState({
        invoiceTitle: "INVOICE",
        footerText: "Thank you for your business!",
        terms: "Payment is due within 30 days.",
        showLogo: true,
        primaryColor: "#16a34a" // melagro-primary
    });

    useEffect(() => {
        // Load template settings
        const loadSettings = async () => {
            const docRef = doc(db, "settings", "documents");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setTemplateSettings({ ...templateSettings, ...docSnap.data() });
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "documents"), templateSettings, { merge: true });
            alert("Template settings saved!");
        } catch (error) {
            console.error("Error saving template settings:", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
                    <p className="text-gray-500 text-sm">Customize your invoices and receipts.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-melagro-primary text-white px-6 py-2 rounded-lg hover:bg-melagro-secondary disabled:opacity-50 transition-colors font-medium"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Editor Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-y-auto">
                    <h2 className="font-bold text-gray-900 mb-6">Editor</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                            <input
                                type="text"
                                value={templateSettings.invoiceTitle}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, invoiceTitle: e.target.value })}
                                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={templateSettings.primaryColor}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, primaryColor: e.target.value })}
                                    className="h-10 w-10 rounded cursor-pointer border-0"
                                />
                                <span className="text-sm text-gray-500">{templateSettings.primaryColor}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="showLogo"
                                checked={templateSettings.showLogo}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, showLogo: e.target.checked })}
                                className="w-4 h-4 text-melagro-primary rounded focus:ring-melagro-primary"
                            />
                            <label htmlFor="showLogo" className="text-sm font-medium text-gray-900">Show Company Logo</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                            <textarea
                                value={templateSettings.footerText}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, footerText: e.target.value })}
                                rows={2}
                                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                            <textarea
                                value={templateSettings.terms}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, terms: e.target.value })}
                                rows={4}
                                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:col-span-2 bg-gray-50 rounded-2xl border border-gray-200 p-8 overflow-y-auto flex items-start justify-center">
                    <div className="w-full max-w-2xl bg-white shadow-lg min-h-[800px] transform scale-90 origin-top">
                        {/* We pass the settings as a prop to the template (we need to update the template to accept this) */}
                        {/* For now, we are just rendering the component, but we will update it next to use these props */}
                        <InvoiceTemplate order={mockOrder} settings={templateSettings} />
                    </div>
                </div>
            </div>
        </div>
    );
}
