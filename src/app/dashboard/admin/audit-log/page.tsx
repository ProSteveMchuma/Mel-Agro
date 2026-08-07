"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";

type AuditEvent = { id: string; action: string; actorEmail?: string; actorId?: string; targetId?: string; createdAt?: string };

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { void (async () => {
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Admin session unavailable.");
      const response = await fetch("/api/admin/audit-log", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not load audit events.");
      setEvents(result.events || []);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load audit events."); }
    finally { setLoading(false); }
  })(); }, []);
  const visible = useMemo(() => events.filter((event) => `${event.action} ${event.actorEmail} ${event.targetId}`.toLowerCase().includes(search.toLowerCase())), [events, search]);
  return <div className="space-y-6">
    <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-green-700">Governance</p><h1 className="mt-1 text-3xl font-black text-gray-900">Admin Audit Log</h1><p className="mt-1 text-sm text-gray-500">A read-only history of sensitive administrative changes.</p></div>
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4"><label><span className="sr-only">Search audit events</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, administrator, or target…" className="min-h-11 w-full max-w-lg rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-green-700 focus:ring-4 focus:ring-green-600/10" /></label></div>
      {loading ? <p className="p-12 text-center text-sm text-gray-500">Loading audit history…</p> : visible.length === 0 ? <p className="p-12 text-center text-sm text-gray-500">No matching audit events.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b bg-gray-50 text-xs text-gray-500"><tr><th className="px-6 py-4">Action</th><th className="px-6 py-4">Administrator</th><th className="px-6 py-4">Target</th><th className="px-6 py-4">Time</th></tr></thead><tbody className="divide-y divide-gray-100">{visible.map((event) => <tr key={event.id}><td className="px-6 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{event.action.replaceAll('_', ' ')}</span></td><td className="px-6 py-4 text-gray-700">{event.actorEmail || event.actorId || "System"}</td><td className="px-6 py-4 font-mono text-xs text-gray-500">{event.targetId || "—"}</td><td className="px-6 py-4 text-gray-500">{event.createdAt ? new Date(event.createdAt).toLocaleString("en-KE") : "—"}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
