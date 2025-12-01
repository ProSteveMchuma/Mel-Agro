"use client";

import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";

export default function SettingsPage() {
    const { general, tax, notifications, updateGeneralSettings, updateTaxSettings, updateNotificationSettings, loading } = useSettings();
    const [activeTab, setActiveTab] = useState("general");
    const [saving, setSaving] = useState(false);

    // Local state for forms (to avoid constant Firestore writes on every keystroke)
    const [generalForm, setGeneralForm] = useState(general);
    const [taxForm, setTaxForm] = useState(tax);
    const [notifForm, setNotifForm] = useState(notifications);

    // Sync local state when context loads
    if (loading) return <div className="p-8">Loading settings...</div>;

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === "general") await updateGeneralSettings(generalForm);
            if (activeTab === "tax") await updateTaxSettings(taxForm);
            if (activeTab === "notifications") await updateNotificationSettings(notifForm);
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 text-sm">Manage global store configuration.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-melagro-primary text-white px-6 py-2 rounded-lg hover:bg-melagro-secondary disabled:opacity-50 transition-colors font-medium"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {['general', 'tax', 'notifications', 'documents', 'shipping'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                                ${activeTab === tab
                                    ? 'border-melagro-primary text-melagro-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {activeTab === "general" && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={generalForm.companyName}
                                    onChange={(e) => setGeneralForm({ ...generalForm, companyName: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                                <input
                                    type="email"
                                    value={generalForm.supportEmail}
                                    onChange={(e) => setGeneralForm({ ...generalForm, supportEmail: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                                <input
                                    type="text"
                                    value={generalForm.supportPhone}
                                    onChange={(e) => setGeneralForm({ ...generalForm, supportPhone: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                                <textarea
                                    value={generalForm.address}
                                    onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                                    rows={3}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "tax" && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <input
                                type="checkbox"
                                id="taxEnabled"
                                checked={taxForm.enabled}
                                onChange={(e) => setTaxForm({ ...taxForm, enabled: e.target.checked })}
                                className="w-4 h-4 text-melagro-primary rounded focus:ring-melagro-primary"
                            />
                            <label htmlFor="taxEnabled" className="text-sm font-medium text-gray-900">Enable Tax Calculation</label>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                                <input
                                    type="number"
                                    value={taxForm.taxRate}
                                    onChange={(e) => setTaxForm({ ...taxForm, taxRate: parseFloat(e.target.value) })}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (KRA PIN)</label>
                                <input
                                    type="text"
                                    value={taxForm.taxId}
                                    onChange={(e) => setTaxForm({ ...taxForm, taxId: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "notifications" && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="emailEnabled"
                                    checked={notifForm.emailEnabled}
                                    onChange={(e) => setNotifForm({ ...notifForm, emailEnabled: e.target.checked })}
                                    className="w-4 h-4 text-melagro-primary rounded focus:ring-melagro-primary"
                                />
                                <label htmlFor="emailEnabled" className="text-sm font-medium text-gray-900">Enable Email Notifications</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="smsEnabled"
                                    checked={notifForm.smsEnabled}
                                    onChange={(e) => setNotifForm({ ...notifForm, smsEnabled: e.target.checked })}
                                    className="w-4 h-4 text-melagro-primary rounded focus:ring-melagro-primary"
                                />
                                <label htmlFor="smsEnabled" className="text-sm font-medium text-gray-900">Enable SMS Notifications</label>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Templates</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Confirmation Template</label>
                                    <textarea
                                        value={notifForm.orderConfirmationTemplate}
                                        onChange={(e) => setNotifForm({ ...notifForm, orderConfirmationTemplate: e.target.value })}
                                        rows={3}
                                        className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none text-sm font-mono"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Available variables: {'{orderId}'}, {'{total}'}, {'{customerName}'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(activeTab === "documents" || activeTab === "shipping") && (
                    <div className="text-center py-12 text-gray-500">
                        This module is coming soon in the next phase.
                    </div>
                )}
            </div>
        </div>
    );
}
