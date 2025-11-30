"use client";
import { useState } from "react";

export default function AdminSettingsPage() {
    const [siteName, setSiteName] = useState("MelAgro");
    const [supportEmail, setSupportEmail] = useState("support@melagro.com");
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    const handleSave = () => {
        // In a real app, save to backend
        alert("Settings saved successfully!");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 text-sm">Manage platform configurations.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="btn-primary px-6 py-2"
                >
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">General Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                            <input
                                type="text"
                                value={siteName}
                                onChange={(e) => setSiteName(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-200 focus:border-melagro-primary focus:ring-1 focus:ring-melagro-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                            <input
                                type="email"
                                value={supportEmail}
                                onChange={(e) => setSupportEmail(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-200 focus:border-melagro-primary focus:ring-1 focus:ring-melagro-primary outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">System Status</h2>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <div className="font-medium text-gray-900">Maintenance Mode</div>
                            <div className="text-xs text-gray-500">Disable the storefront for customers</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={maintenanceMode}
                                onChange={(e) => setMaintenanceMode(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-melagro-primary"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
