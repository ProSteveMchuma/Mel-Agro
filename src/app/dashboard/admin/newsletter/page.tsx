"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { getAuth } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";

type Subscriber = {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  source?: string;
  subscribedAt?: string;
  updatedAt?: string;
};

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function NewsletterAdminPage() {
  const { user } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "unsubscribed">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const token = useCallback(async () => {
    const value = await getAuth().currentUser?.getIdToken();
    if (!value) throw new Error("Admin session is not ready.");
    return value;
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/newsletter", { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not load subscribers.");
      setSubscribers(result.subscribers || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load subscribers.");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => subscribers.filter((subscriber) => {
    const matchesStatus = filter === "all" || subscriber.status === filter;
    const matchesSearch = subscriber.email.toLowerCase().includes(search.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  }), [filter, search, subscribers]);

  const active = subscribers.filter((subscriber) => subscriber.status === "active").length;
  const unsubscribed = subscribers.length - active;

  async function updateStatus(subscriber: Subscriber) {
    const status = subscriber.status === "active" ? "unsubscribed" : "active";
    setUpdating(subscriber.id);
    try {
      const response = await fetch("/api/admin/newsletter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ id: subscriber.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update subscriber.");
      setSubscribers((current) => current.map((item) => item.id === subscriber.id ? { ...item, status } : item));
      toast.success(status === "active" ? "Subscriber reactivated." : "Subscriber unsubscribed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update subscriber.");
    } finally {
      setUpdating(null);
    }
  }

  function exportCsv() {
    const rows = visible.map((item) => [item.email, item.status, item.source || "", item.subscribedAt || ""]);
    const csv = [["Email", "Status", "Source", "Subscribed at"], ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `melagri-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-700">Audience</p>
          <h1 className="mt-1 text-2xl font-black text-gray-900 md:text-3xl">Newsletter Subscribers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage consented email subscribers and export active campaign audiences.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!visible.length} className="rounded-xl bg-gray-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-black disabled:opacity-40">Export visible CSV</button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Subscriber summary">
        {[{ label: "Total records", value: subscribers.length }, { label: "Active", value: active }, { label: "Unsubscribed", value: unsubscribed }].map((item) => (
          <article key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-500">{item.label}</p>
            <p className="mt-2 text-3xl font-black text-gray-900">{item.value.toLocaleString()}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
          <label className="flex-grow">
            <span className="sr-only">Search subscribers</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email address…" className="min-h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-green-700 focus:ring-4 focus:ring-green-600/10" />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 outline-none focus:border-green-700">
              <option value="all">All statuses</option><option value="active">Active</option><option value="unsubscribed">Unsubscribed</option>
            </select>
          </label>
        </div>

        {loading ? <div className="p-12 text-center text-sm text-gray-500">Loading subscribers…</div> : visible.length === 0 ? <div className="p-12 text-center"><p className="font-black text-gray-800">No subscribers found</p><p className="mt-1 text-sm text-gray-500">New confirmed subscriptions will appear here.</p></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500"><tr><th className="px-6 py-4">Email</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Source</th><th className="px-6 py-4">Subscribed</th><th className="px-6 py-4 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{visible.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-gray-50/80">
                  <td className="px-6 py-4 font-semibold text-gray-900">{subscriber.email}</td>
                  <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${subscriber.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{subscriber.status}</span></td>
                  <td className="px-6 py-4 text-gray-500">{subscriber.source || "—"}</td>
                  <td className="px-6 py-4 text-gray-500">{subscriber.subscribedAt ? new Date(subscriber.subscribedAt).toLocaleDateString("en-KE") : "—"}</td>
                  <td className="px-6 py-4 text-right"><button type="button" onClick={() => void updateStatus(subscriber)} disabled={updating === subscriber.id} className={`text-xs font-black ${subscriber.status === "active" ? "text-red-600 hover:text-red-700" : "text-green-700 hover:text-green-800"} disabled:opacity-40`}>{updating === subscriber.id ? "Updating…" : subscriber.status === "active" ? "Unsubscribe" : "Reactivate"}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
