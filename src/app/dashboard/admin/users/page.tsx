"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useUsers } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types";
import { KENYAN_COUNTIES } from "@/lib/delivery";
import { STAFF_PROFILES, StaffProfile, profileForPermissions } from "@/lib/admin-permissions";

type Segment = "all" | "customers" | "admins" | "suspended" | "personalized";
const segments: Array<{ id: Segment; label: string }> = [
  { id: "all", label: "All people" }, { id: "customers", label: "Customers" },
  { id: "admins", label: "Staff" }, { id: "suspended", label: "Suspended" },
  { id: "personalized", label: "Personalization on" },
];

export default function UserManagement() {
  const { updateUserRole, updateUserStatus, updateStaffPermissions, deleteUser } = useUsers();
  const { user: actor } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [segment, setSegment] = useState<Segment>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [county, setCounty] = useState("All");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchLimited, setSearchLimited] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Admin session is unavailable.");
        const params = new URLSearchParams({ segment });
        if (searchTerm.trim()) params.set("q", searchTerm.trim());
        if (county !== "All") params.set("county", county);
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load customers.");
        setUsers(result.users || []); setNextCursor(result.nextCursor || null); setSearchLimited(Boolean(result.searchLimited));
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Could not load customers.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, searchTerm ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [segment, searchTerm, county, cursor, refreshKey]);

  function resetDirectory(next?: { segment?: Segment; search?: string; county?: string }) {
    if (next?.segment !== undefined) setSegment(next.segment);
    if (next?.search !== undefined) setSearchTerm(next.search);
    if (next?.county !== undefined) setCounty(next.county);
    setCursor(null); setCursorHistory([]);
  }
  function refresh() { setRefreshKey((value) => value + 1); }
  function goNext() { if (nextCursor) { setCursorHistory((history) => [...history, cursor]); setCursor(nextCursor); } }
  function goPrevious() { setCursorHistory((history) => { const copy = [...history]; setCursor(copy.pop() ?? null); return copy; }); }

  async function changeRole(user: User, role: "admin" | "user") {
    const notice = toast.loading(`Updating ${user.name || "user"}'s role...`);
    try { await updateUserRole(String(user.id || user.uid), role); toast.success("Role updated", { id: notice }); refresh(); }
    catch (caught) { toast.error(caught instanceof Error ? caught.message : "Role update failed", { id: notice }); }
  }
  async function changeStatus(user: User) {
    const next = user.status === "suspended" ? "active" : "suspended";
    if (next === "suspended" && !window.confirm(`Suspend ${user.name}? They will lose access until reactivated.`)) return;
    const notice = toast.loading(`${next === "active" ? "Reactivating" : "Suspending"} ${user.name || "user"}...`);
    try { await updateUserStatus(String(user.id || user.uid), next); toast.success(next === "active" ? "Customer reactivated" : "Customer suspended", { id: notice }); refresh(); }
    catch (caught) { toast.error(caught instanceof Error ? caught.message : "Status update failed", { id: notice }); }
  }
  async function removeUser(user: User) {
    if (!window.confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    const notice = toast.loading(`Deleting ${user.name || "user"}...`);
    try { await deleteUser(String(user.id || user.uid)); toast.success("User deleted", { id: notice }); refresh(); }
    catch (caught) { toast.error(caught instanceof Error ? caught.message : "Delete failed", { id: notice }); }
  }
  async function changeProfile(user: User, profile: StaffProfile) {
    const notice = toast.loading(`Assigning ${STAFF_PROFILES[profile].label}...`);
    try { await updateStaffPermissions(String(user.id || user.uid), profile, STAFF_PROFILES[profile].permissions); toast.success("Staff permissions updated", { id: notice }); refresh(); }
    catch (caught) { toast.error(caught instanceof Error ? caught.message : "Permission update failed", { id: notice }); }
  }

  return <div className="space-y-5">
    <header><p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Customer operations</p><h1 className="text-2xl font-black tracking-tight text-gray-950">Customers & staff</h1><p className="mt-1 text-sm text-gray-500">Search the complete customer directory and control account access.</p></header>
    <section aria-label="Saved customer segments" className="overflow-x-auto rounded-2xl border border-gray-200 bg-white px-2 shadow-sm"><div className="flex min-w-max gap-1" role="tablist">{segments.map((item) => <button key={item.id} type="button" role="tab" aria-selected={segment === item.id} onClick={() => resetDirectory({ segment: item.id })} className={`relative min-h-12 px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${segment === item.id ? "text-green-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-green-600" : "text-gray-500 hover:text-gray-900"}`}>{item.label}</button>)}</div></section>
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row">
        <label className="relative flex-1"><span className="sr-only">Search customers</span><svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg><input value={searchTerm} onChange={(event) => resetDirectory({ search: event.target.value })} placeholder="Name, email, phone or county" className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10" /></label>
        <label><span className="sr-only">County</span><select value={county} onChange={(event) => resetDirectory({ county: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold"><option value="All">Any county</option>{KENYAN_COUNTIES.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {searchLimited && <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">This broad search checked the next 500 records. Add a more specific name, phone, email, or county to narrow it.</p>}
      {error && <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" onClick={refresh} className="ml-2 font-black underline">Retry</button></div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-3">Person</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Loyalty</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Staff profile</th><th className="px-4 py-3">Access</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{!loading && users.map((user) => {
        const profile = profileForPermissions(user.adminPermissions); const staffLabel = profile === "custom" ? "Custom profile" : STAFF_PROFILES[profile].label;
        return <tr key={user.id || user.uid} onClick={() => router.push(`/dashboard/admin/users/${user.id || user.uid}`)} className="cursor-pointer hover:bg-gray-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 font-black text-green-800">{user.name?.charAt(0).toUpperCase() || "?"}</span><span className="min-w-0"><span className="block truncate font-bold text-gray-950">{user.name || "Unnamed customer"}</span><span className="block truncate text-xs text-gray-500">{user.email || user.phone || "No contact details"}</span></span></div></td><td className="px-4 py-4 text-gray-600">{user.county || user.city || "Not provided"}</td><td className="px-4 py-4"><span className="font-black text-gray-900">{(user.loyaltyPoints || 0).toLocaleString()}</span><span className="ml-1 text-xs text-gray-400">pts</span></td><td className="px-4 py-4" onClick={(event) => event.stopPropagation()}><select value={user.role === "admin" || user.role === "super-admin" ? "admin" : "user"} disabled={user.role === "super-admin" || actor?.role !== "super-admin"} onChange={(event) => changeRole(user, event.target.value as "admin" | "user")} className="rounded-full border-0 bg-gray-50 px-3 py-1.5 text-xs font-bold ring-1 ring-inset ring-gray-200 disabled:opacity-60"><option value="user">Customer</option><option value="admin">Admin</option></select></td><td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>{user.role === "admin" && actor?.role === "super-admin" ? <select value={profile} onChange={(event) => changeProfile(user, event.target.value as StaffProfile)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold"><option value="custom" disabled>Custom profile</option>{Object.entries(STAFF_PROFILES).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select> : <span className="text-xs text-gray-500">{user.role === "super-admin" ? "Super administrator" : user.role === "admin" ? staffLabel : "Not staff"}</span>}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ring-inset ${user.status === "suspended" ? "bg-red-50 text-red-700 ring-red-600/20" : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"}`}>{user.status || "active"}</span></td><td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}><button type="button" disabled={user.role === "super-admin"} onClick={() => changeStatus(user)} className="rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-40">{user.status === "suspended" ? "Reactivate" : "Suspend"}</button><button type="button" disabled={user.role === "super-admin"} onClick={() => removeUser(user)} className="rounded-lg px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40">Delete</button></td></tr>;
      })}</tbody></table></div>
      {loading ? <div className="px-6 py-16 text-center text-sm font-semibold text-gray-500">Loading customer records…</div> : users.length === 0 && !error ? <div className="px-6 py-16 text-center"><p className="font-black text-gray-900">No people found</p><p className="mt-1 text-sm text-gray-500">Try another segment or clear your search.</p></div> : !error && <footer className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between"><span>Page {cursorHistory.length + 1} · showing {users.length} records</span><div className="flex items-center gap-2"><button type="button" disabled={cursorHistory.length === 0} onClick={goPrevious} className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold disabled:opacity-40">Previous</button><button type="button" disabled={!nextCursor} onClick={goNext} className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold disabled:opacity-40">Next</button></div></footer>}
    </section>
  </div>;
}
