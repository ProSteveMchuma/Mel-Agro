"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-hot-toast';

interface IntelligenceAlert {
    id: string;
    type: string;
    severity: 'critical' | 'warning' | 'low';
    title: string;
    summary: string;
    recommendedAction: string;
    status: 'new' | 'acknowledged' | 'assigned' | 'in_progress' | 'resolved' | 'snoozed';
    assignedTo?: string;
    resolutionReason?: string;
    sourceWindow?: { orders?: number; products?: number };
}

async function adminRequest(path: string, init?: RequestInit) {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error('Admin session is unavailable');
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
}

export default function ActionCentrePage() {
    const [alerts, setAlerts] = useState<IntelligenceAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [filter, setFilter] = useState<'open' | 'all' | 'resolved'>('open');
    const [owners, setOwners] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        try {
            const data = await adminRequest('/api/admin/intelligence/alerts');
            setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to load alerts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const sync = async () => {
        setSyncing(true);
        try {
            const data = await adminRequest('/api/admin/intelligence/alerts', { method: 'POST' });
            toast.success(`${data.generated} current signals reviewed`);
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Signal refresh failed');
        } finally { setSyncing(false); }
    };

    const update = async (alert: IntelligenceAlert, status: IntelligenceAlert['status']) => {
        const resolutionReason = status === 'resolved' ? window.prompt('Resolution outcome (required):')?.trim() : '';
        if (status === 'resolved' && !resolutionReason) return;
        try {
            await adminRequest('/api/admin/intelligence/alerts', { method: 'PATCH', body: JSON.stringify({ id: alert.id, status, assignedTo: owners[alert.id] ?? alert.assignedTo ?? '', resolutionReason }) });
            await load();
            toast.success('Alert updated');
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Update failed'); }
    };

    const visible = useMemo(() => alerts.filter(alert => filter === 'all' || (filter === 'resolved' ? alert.status === 'resolved' : alert.status !== 'resolved')), [alerts, filter]);
    const open = alerts.filter(alert => alert.status !== 'resolved').length;
    const critical = alerts.filter(alert => alert.status !== 'resolved' && alert.severity === 'critical').length;

    return (
        <div className="space-y-8">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Human-controlled operations</p><h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">Intelligence Action Centre</h1><p className="mt-1 text-sm text-gray-500">Review evidence, assign ownership, and record outcomes for every operational signal.</p></div>
                <button onClick={sync} disabled={syncing} className="rounded-xl bg-gray-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700 disabled:opacity-50">{syncing ? 'Reviewing signals…' : 'Refresh signals'}</button>
            </header>
            <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-gray-100 bg-white p-5"><p className="text-xs font-bold text-gray-400">Open work</p><p className="mt-1 text-3xl font-black">{open}</p></div><div className="rounded-2xl border border-red-100 bg-red-50 p-5"><p className="text-xs font-bold text-red-600">Critical</p><p className="mt-1 text-3xl font-black text-red-800">{critical}</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5"><p className="text-xs font-bold text-gray-400">Data coverage</p><p className="mt-1 text-sm font-black text-gray-800">{alerts[0]?.sourceWindow?.orders ?? 0} orders · {alerts[0]?.sourceWindow?.products ?? 0} products</p></div></div>
            <div className="flex gap-2" role="group" aria-label="Filter alerts">{(['open', 'all', 'resolved'] as const).map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${filter === value ? 'bg-emerald-700 text-white' : 'bg-white text-gray-500'}`}>{value}</button>)}</div>
            {loading ? <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-500">Loading action centre…</div> : visible.length === 0 ? <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center"><p className="font-black text-gray-800">No alerts in this view</p><p className="mt-1 text-sm text-gray-500">Refresh signals to evaluate current operations.</p></div> : <div className="space-y-4">{visible.map(alert => <article key={alert.id} className={`rounded-2xl border bg-white p-6 ${alert.severity === 'critical' ? 'border-red-200' : 'border-amber-100'}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-2xl"><div className="flex gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${alert.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{alert.severity}</span><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[9px] font-black uppercase text-gray-600">{alert.type}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase text-blue-700">{alert.status.replace('_', ' ')}</span></div><h2 className="mt-3 text-lg font-black text-gray-900">{alert.title}</h2><p className="mt-1 text-sm text-gray-600">{alert.summary}</p><div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"><span className="font-black">Recommended:</span> {alert.recommendedAction}</div>{alert.resolutionReason && <p className="mt-3 text-xs text-gray-500"><strong>Outcome:</strong> {alert.resolutionReason}</p>}</div><div className="w-full max-w-xs space-y-2"><label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Owner<input value={owners[alert.id] ?? alert.assignedTo ?? ''} onChange={event => setOwners(current => ({ ...current, [alert.id]: event.target.value }))} placeholder="Name or team" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800" /></label><div className="grid grid-cols-2 gap-2"><button onClick={() => update(alert, owners[alert.id] || alert.assignedTo ? 'assigned' : 'acknowledged')} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold">{owners[alert.id] || alert.assignedTo ? 'Assign' : 'Acknowledge'}</button><button onClick={() => update(alert, 'in_progress')} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">Start work</button><button onClick={() => update(alert, 'snoozed')} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold">Snooze</button><button onClick={() => update(alert, 'resolved')} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Resolve</button></div></div></div></article>)}</div>}
        </div>
    );
}
