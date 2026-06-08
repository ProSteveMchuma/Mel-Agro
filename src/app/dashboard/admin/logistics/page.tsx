"use client";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { KENYAN_COUNTIES, DeliveryZone, getDeliveryCost, FREE_SHIPPING_THRESHOLD } from "@/lib/delivery";
import { useOrders } from "@/context/OrderContext";

type ZoneFormState = {
    id?: string;
    name: string;
    regions: string[];
    price: string;
    etaMinDays: string;
    etaMaxDays: string;
    etaText: string;
    freeShippingThreshold: string;
    isFallback: boolean;
    order: string;
};

const blankForm: ZoneFormState = {
    name: '',
    regions: [],
    price: '',
    etaMinDays: '0',
    etaMaxDays: '1',
    etaText: '',
    freeShippingThreshold: '',
    isFallback: false,
    order: '10',
};

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

function autoEtaText(min: number, max: number): string {
    if (min === 0 && max <= 1) return 'Same day or next day';
    if (min === max) return `${min} business day${min === 1 ? '' : 's'}`;
    return `${min}–${max} business days`;
}

export default function LogisticsPage() {
    const { orders } = useOrders();
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<ZoneFormState | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Preview tile state
    const [previewCounty, setPreviewCounty] = useState('Nairobi');
    const [previewTotal, setPreviewTotal] = useState('5000');

    // Live subscription
    useEffect(() => {
        const q = query(collection(db, 'shipping_zones'), orderBy('order', 'asc'));
        const unsub = onSnapshot(
            q,
            (snap) => {
                setZones(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DeliveryZone[]);
                setLoading(false);
            },
            (err) => {
                console.error('logistics listener:', err);
                toast.error('Could not load zones');
                setLoading(false);
            },
        );
        return () => unsub();
    }, []);

    // Duplicate-region detection: which counties are claimed by more than one zone
    const duplicateRegions = useMemo(() => {
        const seen = new Map<string, string[]>();
        for (const z of zones) {
            for (const r of z.regions || []) {
                if (!seen.has(r)) seen.set(r, []);
                seen.get(r)!.push(z.name);
            }
        }
        const dupes = new Map<string, string[]>();
        for (const [region, owners] of seen.entries()) {
            if (owners.length > 1) dupes.set(region, owners);
        }
        return dupes;
    }, [zones]);

    // Per-zone analytics for the last 30 days
    const zoneAnalytics = useMemo(() => {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const byZone = new Map<string, { orders: number; revenue: number }>();
        for (const o of orders) {
            const t = new Date(o.date).getTime();
            if (!Number.isFinite(t) || t < cutoff) continue;
            if ((o as any).paymentStatus !== 'Paid') continue;
            const county = String((o as any).shippingAddress?.county || '');
            const info = getDeliveryCost(county, Number(o.total) || 0, zones);
            const key = info.zoneName === 'Free Shipping'
                ? (zones.find(z => (z.regions || []).some(r => r.toLowerCase() === county.toLowerCase()))?.name || 'Free Shipping')
                : info.zoneName;
            const cur = byZone.get(key) || { orders: 0, revenue: 0 };
            cur.orders += 1;
            cur.revenue += Number(o.total) || 0;
            byZone.set(key, cur);
        }
        return byZone;
    }, [orders, zones]);

    // Preview rate
    const previewResult = useMemo(() => {
        const total = Number(previewTotal) || 0;
        return getDeliveryCost(previewCounty, total, zones);
    }, [previewCounty, previewTotal, zones]);

    // ── Handlers ────────────────────────────────────────────────────────

    const startCreate = () => setEditing({ ...blankForm });
    const startEdit = (zone: DeliveryZone) => {
        setEditing({
            id: zone.id,
            name: zone.name,
            regions: zone.regions || [],
            price: String(zone.price ?? ''),
            etaMinDays: String(zone.etaMinDays ?? '0'),
            etaMaxDays: String(zone.etaMaxDays ?? '1'),
            etaText: zone.etaText || '',
            freeShippingThreshold: zone.freeShippingThreshold ? String(zone.freeShippingThreshold) : '',
            isFallback: !!zone.isFallback,
            order: String(zone.order ?? '10'),
        });
    };

    const toggleRegion = (county: string) => {
        if (!editing) return;
        const has = editing.regions.includes(county);
        setEditing({
            ...editing,
            regions: has ? editing.regions.filter(r => r !== county) : [...editing.regions, county],
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        if (!editing.name.trim()) { toast.error('Name is required'); return; }
        if (editing.regions.length === 0 && !editing.isFallback) { toast.error('Select at least one region (or mark this zone as the fallback).'); return; }

        const minEta = Number(editing.etaMinDays);
        const maxEta = Number(editing.etaMaxDays);
        if (!Number.isFinite(minEta) || minEta < 0) { toast.error('Min ETA must be a non-negative number'); return; }
        if (!Number.isFinite(maxEta) || maxEta < minEta) { toast.error('Max ETA must be ≥ min ETA'); return; }

        // If marking this as fallback, ensure no other zone is also a fallback
        if (editing.isFallback) {
            const otherFallback = zones.find(z => z.isFallback && z.id !== editing.id);
            if (otherFallback) {
                toast.error(`"${otherFallback.name}" is already the fallback zone. Unmark it first.`);
                return;
            }
        }

        const payload: Omit<DeliveryZone, 'id'> = {
            name: editing.name.trim(),
            regions: editing.regions,
            price: Math.max(0, Number(editing.price) || 0),
            etaMinDays: minEta,
            etaMaxDays: maxEta,
            etaText: editing.etaText.trim() || autoEtaText(minEta, maxEta),
            freeShippingThreshold: editing.freeShippingThreshold ? Math.max(0, Number(editing.freeShippingThreshold)) : 0,
            isFallback: editing.isFallback,
            order: Number(editing.order) || 10,
        };

        setSaving(true);
        try {
            if (editing.id) {
                await updateDoc(doc(db, 'shipping_zones', editing.id), payload as any);
                toast.success('Zone updated');
            } else {
                await addDoc(collection(db, 'shipping_zones'), payload);
                toast.success('Zone created');
            }
            setEditing(null);
        } catch (err: any) {
            console.error('save zone:', err);
            toast.error(err?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDoc(doc(db, 'shipping_zones', deleteId));
            toast.success('Zone deleted');
        } catch (err: any) {
            toast.error(err?.message || 'Delete failed');
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Logistics & Shipping</h1>
                    <p className="text-gray-500 text-sm mt-1">Live shipping zones — edits propagate to checkout in real time.</p>
                </div>
                <button
                    onClick={startCreate}
                    className="px-4 py-2.5 bg-melagri-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-melagri-secondary transition-colors flex items-center gap-2"
                >
                    + New Zone
                </button>
            </div>

            {duplicateRegions.size > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                    <p className="font-black text-amber-900 text-sm uppercase tracking-tight mb-2">⚠ Duplicate region assignments</p>
                    <ul className="text-xs text-amber-800 space-y-1">
                        {Array.from(duplicateRegions.entries()).map(([region, owners]) => (
                            <li key={region}>
                                <span className="font-bold">{region}</span> is in: {owners.join(', ')}
                            </li>
                        ))}
                    </ul>
                    <p className="text-[11px] text-amber-700 mt-2 font-medium">First match wins at checkout. Move duplicates to a single zone for predictable rates.</p>
                </div>
            )}

            {/* Preview tile */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-6 border-2 border-emerald-100 shadow-sm">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">Rate preview</p>
                        <p className="text-xs text-gray-500 font-medium">Pick a county and order total — see the rate a customer would pay.</p>
                    </div>
                    <div className="flex flex-wrap gap-3 ml-auto">
                        <select
                            value={previewCounty}
                            onChange={(e) => setPreviewCounty(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-melagri-primary/20 outline-none bg-white"
                        >
                            {KENYAN_COUNTIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <input
                            type="number"
                            value={previewTotal}
                            onChange={(e) => setPreviewTotal(e.target.value)}
                            placeholder="Order total"
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-melagri-primary/20 outline-none bg-white w-32"
                        />
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Zone</p>
                        <p className="text-sm font-black text-gray-900 mt-1">{previewResult.zoneName}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate</p>
                        <p className={`text-2xl font-black tracking-tighter mt-1 ${previewResult.cost === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                            {previewResult.cost === 0 ? 'FREE' : fmtKES(previewResult.cost)}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ETA</p>
                        <p className="text-sm font-black text-gray-900 mt-1">{previewResult.etaText}</p>
                    </div>
                </div>
            </div>

            {/* Zones list */}
            {loading && zones.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100"></div>
                    ))}
                </div>
            ) : zones.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                    No shipping zones yet. The first deploy auto-seeds defaults — refresh in a moment, or click "+ New Zone".
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {zones.map(zone => {
                        const an = zoneAnalytics.get(zone.name);
                        return (
                            <div key={zone.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
                                <div className="flex justify-between items-start mb-4 gap-2">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 tracking-tight">{zone.name}</h3>
                                        {zone.isFallback && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-black uppercase tracking-wider">Fallback</span>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => startEdit(zone)} className="p-2 text-gray-400 hover:text-melagri-primary" title="Edit">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => zone.id && setDeleteId(zone.id)} className="p-2 text-gray-400 hover:text-red-500" title="Delete">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate</p>
                                        <p className="text-xl font-black text-gray-900 tracking-tight mt-1">{fmtKES(zone.price)}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ETA</p>
                                        <p className="text-sm font-black text-gray-900 mt-1">{zone.etaText}</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Regions ({(zone.regions || []).length})</p>
                                    <div className="flex flex-wrap gap-1">
                                        {(zone.regions || []).slice(0, 6).map(r => (
                                            <span key={r} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium">{r}</span>
                                        ))}
                                        {(zone.regions || []).length > 6 && (
                                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[11px] font-medium">+{(zone.regions || []).length - 6} more</span>
                                        )}
                                    </div>
                                </div>

                                {zone.freeShippingThreshold ? (
                                    <p className="text-[11px] text-emerald-600 font-medium mb-3">Free shipping over {fmtKES(zone.freeShippingThreshold)}</p>
                                ) : null}

                                {an ? (
                                    <div className="mt-auto pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Orders 30d</p>
                                            <p className="text-lg font-black text-gray-900 tracking-tight">{an.orders}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue 30d</p>
                                            <p className="text-lg font-black text-melagri-primary tracking-tight">{fmtKES(an.revenue)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-auto pt-3 border-t border-gray-100">
                                        <p className="text-[11px] text-gray-400 italic">No paid orders in this zone in the last 30 days.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Edit modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-8 my-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">{editing.id ? 'Edit zone' : 'New zone'}</h2>
                                <p className="text-xs text-gray-500 mt-1">Changes go live the moment you save.</p>
                            </div>
                            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Zone name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Nairobi Region"
                                        value={editing.name}
                                        onChange={e => setEditing({ ...editing, name: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/20 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Display order</label>
                                    <input
                                        type="number"
                                        value={editing.order}
                                        onChange={e => setEditing({ ...editing, order: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/20 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Base rate (KES)</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        value={editing.price}
                                        onChange={e => setEditing({ ...editing, price: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/20 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                        Free-shipping threshold (KES) <span className="text-gray-400 normal-case">— leave blank for global default ({fmtKES(FREE_SHIPPING_THRESHOLD)})</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0 = none"
                                        value={editing.freeShippingThreshold}
                                        onChange={e => setEditing({ ...editing, freeShippingThreshold: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/20 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Min ETA (days)</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        value={editing.etaMinDays}
                                        onChange={e => setEditing({ ...editing, etaMinDays: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/20 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Max ETA (days)</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        value={editing.etaMaxDays}
                                        onChange={e => setEditing({ ...editing, etaMaxDays: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/20 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                        ETA text <span className="text-gray-400 normal-case">— leave blank to auto-fill from min/max</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1–2 business days"
                                        value={editing.etaText}
                                        onChange={e => setEditing({ ...editing, etaText: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/20 outline-none text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-purple-50 border-2 border-purple-100 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editing.isFallback}
                                    onChange={e => setEditing({ ...editing, isFallback: e.target.checked })}
                                    className="w-5 h-5 accent-purple-600"
                                />
                                <div>
                                    <p className="font-black text-sm text-purple-900">Use as fallback zone</p>
                                    <p className="text-[11px] text-purple-700">Catches any county not covered by another zone. Only one zone can be the fallback.</p>
                                </div>
                            </label>

                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Regions ({editing.regions.length} selected)
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-3 border border-gray-200 rounded-xl">
                                    {KENYAN_COUNTIES.map(county => {
                                        const dupOwners = (duplicateRegions.get(county) || []).filter(o => o !== editing.name);
                                        return (
                                            <label key={county} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={editing.regions.includes(county)}
                                                    onChange={() => toggleRegion(county)}
                                                    className="rounded text-melagri-primary focus:ring-melagri-primary"
                                                />
                                                <span className="text-[13px] text-gray-700">{county}</span>
                                                {dupOwners.length > 0 && editing.regions.includes(county) && (
                                                    <span className="text-[9px] font-black text-amber-600 uppercase" title={`Also in: ${dupOwners.join(', ')}`}>dup</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-melagri-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-melagri-secondary disabled:opacity-60"
                                >
                                    {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create zone'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8">
                        <h3 className="text-lg font-black text-gray-900 mb-2">Delete this zone?</h3>
                        <p className="text-sm text-gray-500 mb-6">Counties in this zone will fall back to "Rest of Kenya" rates at checkout until reassigned. This can&apos;t be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
