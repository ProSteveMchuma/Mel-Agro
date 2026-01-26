"use client";

import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";

export default function SettingsPage() {
    const { general, tax, notifications, shipping, updateGeneralSettings, updateTaxSettings, updateNotificationSettings, updateShippingSettings, loading } = useSettings();
    const [activeTab, setActiveTab] = useState("general");
    const [saving, setSaving] = useState(false);

    // Local state for forms
    const [generalForm, setGeneralForm] = useState(general);
    const [taxForm, setTaxForm] = useState(tax);
    const [notifForm, setNotifForm] = useState(notifications);
    const [shippingForm, setShippingForm] = useState(shipping);

    // Sync local state when context loads
    if (loading) return <div className="p-8">Loading settings...</div>;

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === "general") await updateGeneralSettings(generalForm);
            if (activeTab === "tax") await updateTaxSettings(taxForm);
            if (activeTab === "notifications") await updateNotificationSettings(notifForm);
            if (activeTab === "shipping") await updateShippingSettings(shippingForm);
            alert("Settings saved successfully!");
        } catch (error: any) {
            console.error("Error saving settings:", error);
            if (error.code === 'permission-denied') {
                alert("Error: You do not have permission to save these settings.");
            } else {
                alert(`Failed to save settings: ${error.message}`);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleZonePriceChange = (index: number, newPrice: number) => {
        const newZones = [...shippingForm.zones];
        newZones[index] = { ...newZones[index], price: newPrice };
        setShippingForm({ ...shippingForm, zones: newZones });
    };

    return (
        <div className="space-y-6">
            {/* ... Header and Tabs ... */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 text-sm">Manage global store configuration.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-melagri-primary text-white px-6 py-2 rounded-lg hover:bg-melagri-secondary disabled:opacity-50 transition-colors font-medium"
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
                                    ? 'border-melagri-primary text-melagri-primary'
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
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                                <input
                                    type="email"
                                    value={generalForm.supportEmail}
                                    onChange={(e) => setGeneralForm({ ...generalForm, supportEmail: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                                <input
                                    type="text"
                                    value={generalForm.supportPhone}
                                    onChange={(e) => setGeneralForm({ ...generalForm, supportPhone: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                                <textarea
                                    value={generalForm.address}
                                    onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                                    rows={3}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
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
                                className="w-4 h-4 text-melagri-primary rounded focus:ring-melagri-primary"
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
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (KRA PIN)</label>
                                <input
                                    type="text"
                                    value={taxForm.taxId}
                                    onChange={(e) => setTaxForm({ ...taxForm, taxId: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
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
                                    className="w-4 h-4 text-melagri-primary rounded focus:ring-melagri-primary"
                                />
                                <label htmlFor="emailEnabled" className="text-sm font-medium text-gray-900">Enable Email Notifications</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="smsEnabled"
                                    checked={notifForm.smsEnabled}
                                    onChange={(e) => setNotifForm({ ...notifForm, smsEnabled: e.target.checked })}
                                    className="w-4 h-4 text-melagri-primary rounded focus:ring-melagri-primary"
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
                                        className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none text-sm font-mono"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Available variables: {'{orderId}'}, {'{total}'}, {'{customerName}'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "shipping" && (
                    <div className="space-y-6">
                        <p className="text-sm text-gray-500">Configure delivery zones and pricing. These rates will be calculated at checkout based on the customer's county.</p>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Zone Name</th>
                                        <th className="px-6 py-3 font-medium">Regions (Counties)</th>
                                        <th className="px-6 py-3 font-medium text-right">Delivery Price (KES)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {shippingForm.zones.map((zone, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{zone.name}</td>
                                            <td className="px-6 py-4 text-gray-600 max-w-md">
                                                <div className="flex flex-wrap gap-1">
                                                    {zone.regions.map(r => (
                                                        <span key={r} className="bg-gray-100 px-2 py-0.5 rounded text-xs">{r}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <input
                                                    type="number"
                                                    value={zone.price}
                                                    onChange={(e) => handleZonePriceChange(index, parseFloat(e.target.value))}
                                                    className="w-32 p-2 text-right rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagri-primary/50 outline-none"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "documents" && (
                    <div className="text-center py-12 text-gray-500">
                        This module is coming soon in the next phase.
                    </div>
                )}
            </div>
        </div>
    );
}
