"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

const CATEGORIES = ['Seeds', 'Fertilizers', 'Agrochemicals', 'Equipment', 'Animal Feed', 'Other'];
const TIMELINES = ['Within 1 week', '2–4 weeks', '1–3 months', 'Just exploring'];

export default function BulkInquiryForm() {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState({
        name: '',
        organisation: '',
        email: '',
        phone: '',
        county: '',
        estimatedValue: '',
        categories: [] as string[],
        timeline: '',
        message: '',
    });

    const toggleCategory = (cat: string) => {
        setForm(f => ({
            ...f,
            categories: f.categories.includes(cat)
                ? f.categories.filter(c => c !== cat)
                : [...f.categories, cat],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.phone.trim()) {
            toast.error('Name and phone are required');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/bulk-inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                setSubmitted(true);
            } else {
                toast.error(data.message || 'Submission failed');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-green-50 border-2 border-green-200 p-8 rounded-2xl text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="font-black text-xl text-green-900 mb-2">Inquiry received</h3>
                <p className="text-sm text-green-800">Our sales team will contact you within 24 hours via phone or email.</p>
                <p className="text-xs text-green-700 mt-3">Need it urgently? Call us: <a href="tel:+254748970757" className="underline font-bold">+254 748 970 757</a></p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-yellow-50 p-6 sm:p-8 rounded-2xl border border-yellow-100 mt-8 space-y-5">
            <div>
                <h3 className="font-black text-xl text-yellow-900 mb-1">Request a Quote</h3>
                <p className="text-sm text-yellow-800">Tell us what you need. Our sales team will reach out within 24 hours.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Full Name *</label>
                    <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-yellow-200 bg-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Organisation</label>
                    <input
                        type="text"
                        placeholder="Co-op, school, NGO, farm name"
                        value={form.organisation}
                        onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-yellow-200 bg-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Phone *</label>
                    <input
                        type="tel"
                        required
                        placeholder="+254 7XX XXX XXX"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-yellow-200 bg-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Email</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-yellow-200 bg-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">County</label>
                    <input
                        type="text"
                        placeholder="e.g. Nakuru"
                        value={form.county}
                        onChange={(e) => setForm({ ...form, county: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-yellow-200 bg-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Estimated Order (KES)</label>
                    <input
                        type="number"
                        placeholder="100000"
                        min="0"
                        value={form.estimatedValue}
                        onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-yellow-200 bg-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none text-sm"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Categories Needed</label>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            type="button"
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                form.categories.includes(cat)
                                    ? 'bg-yellow-600 text-white border-yellow-600'
                                    : 'bg-white text-gray-700 border-yellow-200 hover:border-yellow-400'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Timeline</label>
                <select
                    value={form.timeline}
                    onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-yellow-200 bg-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none text-sm"
                >
                    <option value="">Select...</option>
                    {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                    rows={4}
                    placeholder="Specific products, brands, or delivery requirements..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-yellow-200 bg-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none text-sm"
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-4 bg-yellow-600 text-white font-black uppercase tracking-wider rounded-xl hover:bg-yellow-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
                {submitting ? 'Submitting...' : 'Send Inquiry'}
            </button>

            <p className="text-xs text-gray-600">
                Or call us directly: <a href="tel:+254748970757" className="font-bold text-yellow-700">+254 748 970 757</a>
            </p>
        </form>
    );
}
