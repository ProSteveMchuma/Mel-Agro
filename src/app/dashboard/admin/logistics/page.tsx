"use client";
import { useState, useEffect } from "react";
import { DELIVERY_ZONES, DeliveryZone } from "@/lib/delivery";

export default function LogisticsPage() {
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editRate, setEditRate] = useState<number>(0);

    useEffect(() => {
        // In a real app, fetch from API/Firestore
        setZones(DELIVERY_ZONES);
    }, []);

    const handleEdit = (zone: DeliveryZone) => {
        setIsEditing(zone.name);
        setEditRate(zone.price);
    };

    const handleSave = (zoneName: string) => {
        setZones(prev => prev.map(z => z.name === zoneName ? { ...z, price: editRate } : z));
        setIsEditing(null);
        // In a real app, save to API/Firestore
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Logistics & Delivery Zones</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Zone Name</th>
                            <th className="px-6 py-4">Regions Covered</th>
                            <th className="px-6 py-4">Delivery Rate (KES)</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {zones.map((zone) => (
                            <tr
                                key={zone.name}
                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => {
                                    if (isEditing !== zone.name) {
                                        handleEdit(zone);
                                    }
                                }}
                            >
                                <td className="px-6 py-4 font-medium text-gray-900">{zone.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={zone.regions.join(", ")}>
                                    {zone.regions.join(", ")}
                                </td>
                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                    {isEditing === zone.name ? (
                                        <input
                                            type="number"
                                            value={editRate}
                                            onChange={(e) => setEditRate(Number(e.target.value))}
                                            className="w-24 p-1 border rounded"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-bold text-melagro-primary">KES {zone.price.toLocaleString()}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                    {isEditing === zone.name ? (
                                        <button
                                            onClick={() => handleSave(zone.name)}
                                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                                        >
                                            Save
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleEdit(zone)}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
