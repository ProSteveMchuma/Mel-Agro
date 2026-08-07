"use client";

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';

type HealthData = {
    generatedAt: string;
    overall: 'healthy' | 'attention';
    checks: Array<{ id: string; label: string; status: 'healthy' | 'warning'; detail: string }>;
    outcomes: { impressions: number; clicks: number; addToCarts: number; clickThroughRate: number; addToCartRate: number };
    experiment: { id: string; treatmentPercent: number; primaryMetric: string; guardrails: string[] };
    retentionDays: Record<string, number>;
    notes: string[];
};

export default function IntelligenceHealthPage() {
    const [data, setData] = useState<HealthData | null>(null);
    const [error, setError] = useState('');
    const load = useCallback(async () => {
        setError('');
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/admin/intelligence/health', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Unable to load intelligence health');
        setData(body);
    }, []);
    useEffect(() => { void load().catch(error => setError(error.message)); }, [load]);

    if (error) return <div className="rounded-2xl bg-red-50 p-5 text-red-700">{error}</div>;
    if (!data) return <div className="p-8 text-sm text-gray-500">Checking intelligence systems…</div>;

    return <div className="space-y-8 pb-16">
        <header className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Measurement and governance</p><h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">Intelligence Health</h1><p className="mt-1 text-sm text-gray-500">Data quality, freshness, reconciliation, retention, and experiment outcomes.</p></div>
            <button onClick={() => void load().catch(error => setError(error.message))} className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white">Refresh checks</button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
            {[['Impressions', data.outcomes.impressions], ['Click-through rate', `${(data.outcomes.clickThroughRate * 100).toFixed(1)}%`], ['Recommendation cart rate', `${(data.outcomes.addToCartRate * 100).toFixed(1)}%`]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p><p className="mt-2 text-3xl font-black text-gray-900">{value}</p></div>)}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
            {data.checks.map(check => <article key={check.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="font-black text-gray-900">{check.label}</h2><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${check.status === 'healthy' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{check.status}</span></div><p className="mt-2 text-sm text-gray-600">{check.detail}</p></article>)}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6"><h2 className="font-black">Controlled experiment</h2><p className="mt-2 text-sm text-gray-600"><strong>{data.experiment.id}</strong> assigns {data.experiment.treatmentPercent}% to personalized ranking using a stable subject key. Primary metric: {data.experiment.primaryMetric}.</p><p className="mt-3 text-xs font-bold text-gray-500">Guardrails: {data.experiment.guardrails.join(' · ')}</p></div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6"><h2 className="font-black">Retention policy</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm">{Object.entries(data.retentionDays).map(([key, days]) => <div key={key} className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">{key}</p><p className="font-black">{days} days</p></div>)}</div></div>
        </section>
        <p className="text-xs text-gray-400">Generated {new Date(data.generatedAt).toLocaleString()}. {data.notes.join(' ')}</p>
    </div>;
}
