"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { KENYAN_COUNTIES } from "@/lib/delivery";

interface ShippingRate {
    type: 'FLAT' | 'WEIGHT_BASED';
    baseRate: number;
    ratePerKg?: number;
    freeShippingThreshold?: number;
}

interface ShippingZone {
    id: string;
    name: string;
    regions: string[]; // Counties
    rates: ShippingRate;
}

export default function LogisticsPage() {
    const [zones, setZones] = useState<ShippingZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState<{
        name: string;
        regions: string[];
        rates: ShippingRate;
    }>({
        name: '',
        regions: [],
        rates: { type: 'FLAT', baseRate: 0, freeShippingThreshold: 0 }
    });

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        try {
            const q = query(collection(db, "shipping_zones"), orderBy("name"));
            const snapshot = await getDocs(q);
            const zoneList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ShippingZone[];
            setZones(zoneList);
        } catch (error) {
            console.error("Error fetching zones:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegionToggle = (county: string) => {
        setFormData(prev => {
            const regions = prev.regions.includes(county)
                ? prev.regions.filter(r => r !== county)
                : [...prev.regions, county];
            return { ...prev, regions };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, "shipping_zones"), {
                name: formData.name,
                regions: formData.regions,
                rates: {
                    type: formData.rates.type,
                    baseRate: Number(formData.rates.baseRate),
                    ratePerKg: formData.rates.ratePerKg ? Number(formData.rates.ratePerKg) : 0,
                    freeShippingThreshold: formData.rates.freeShippingThreshold ? Number(formData.rates.freeShippingThreshold) : 0
                }
            });
            setIsCreating(false);
            setFormData({ name: '', regions: [], rates: { type: 'FLAT', baseRate: 0, freeShippingThreshold: 0 } });
            fetchZones();
        } catch (error) {
            console.error("Error creating zone:", error);
            alert("Failed to create shipping zone.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this zone?")) return;
        try {
            await deleteDoc(doc(db, "shipping_zones", id));
            setZones(zones.filter(z => z.id !== id));
        } catch (error) {
            console.error("Error deleting zone:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Logistics & Shipping</h1>
                    <p className="text-gray-500 text-sm">Manage shipping zones and delivery rates.</p>
                </div>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="btn-primary flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {isCreating ? 'Cancel' : 'Add Shipping Zone'}
                </button>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">New Shipping Zone</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Nairobi Region"
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Regions (Counties)</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg custom-scrollbar">
                                    {KENYAN_COUNTIES.map(county => (
                                        <label key={county} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={formData.regions.includes(county)}
                                                onChange={() => handleRegionToggle(county)}
                                                className="rounded text-melagro-primary focus:ring-melagro-primary"
                                            />
                                            <span className="text-sm text-gray-600">{county}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{formData.regions.length} regions selected</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Type</label>
                                <select
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                    value={formData.rates.type}
                                    onChange={e => setFormData({ ...formData, rates: { ...formData.rates, type: e.target.value as any } })}
                                >
                                    <option value="FLAT">Flat Rate</option>
                                    <option value="WEIGHT_BASED">Weight Based (Not implemented yet)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate (KES)</label>
                                <input
                                    required
                                    type="number"
                                    placeholder="0"
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                    value={formData.rates.baseRate}
                                    onChange={e => setFormData({ ...formData, rates: { ...formData.rates, baseRate: Number(e.target.value) } })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Free Shipping Threshold (Optional)</label>
                                <input
                                    type="number"
                                    placeholder="0 (No free shipping)"
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none"
                                    value={formData.rates.freeShippingThreshold}
                                    onChange={e => setFormData({ ...formData, rates: { ...formData.rates, freeShippingThreshold: Number(e.target.value) } })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-melagro-primary text-white px-6 py-2 rounded-lg hover:bg-melagro-secondary transition-colors font-bold"
                            >
                                {loading ? 'Saving...' : 'Create Zone'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zones.map(zone => (
                    <div key={zone.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-gray-900">{zone.name}</h3>
                            <button
                                onClick={() => handleDelete(zone.id)}
                                className="text-red-400 hover:text-red-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-grow space-y-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Regions</p>
                                <div className="flex flex-wrap gap-1">
                                    {zone.regions.slice(0, 5).map(r => (
                                        <span key={r} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{r}</span>
                                    ))}
                                    {zone.regions.length > 5 && (
                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">+{zone.regions.length - 5} more</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rates</p>
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700">Base Rate</span>
                                    <span className="font-bold text-gray-900">KES {zone.rates.baseRate}</span>
                                </div>
                                {zone.rates.freeShippingThreshold ? (
                                    <div className="mt-2 text-xs text-green-600 font-medium">
                                        Free shipping over KES {zone.rates.freeShippingThreshold}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ))}

                {zones.length === 0 && !loading && (
                    <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                        No shipping zones defined. Create one to start managing delivery rates.
                    </div>
                )}
            </div>
        </div>
    );
}
