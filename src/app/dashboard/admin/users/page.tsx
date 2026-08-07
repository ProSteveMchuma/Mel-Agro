"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useUsers } from "@/context/UserContext";
import type { User } from "@/types";
import { STAFF_PROFILES, StaffProfile, profileForPermissions } from "@/lib/admin-permissions";
import { useAuth } from "@/context/AuthContext";

type Segment = "all" | "customers" | "admins" | "suspended" | "personalized";
const PAGE_SIZE = 20;
const segments: Array<{ id: Segment; label: string; matches: (user: User) => boolean }> = [
  { id: "all", label: "All people", matches: () => true },
  { id: "customers", label: "Customers", matches: (user) => user.role === "user" || user.role === "customer" },
  { id: "admins", label: "Staff", matches: (user) => user.role === "admin" || user.role === "super-admin" },
  { id: "suspended", label: "Suspended", matches: (user) => user.status === "suspended" },
  { id: "personalized", label: "Personalization on", matches: (user) => user.personalizationEnabled === true },
];

export default function UserManagement() {
  const { users, updateUserRole, updateUserStatus, updateStaffPermissions, deleteUser } = useUsers();
  const { user: actor } = useAuth();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [county, setCounty] = useState("All");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => Object.fromEntries(segments.map((item) => [item.id, users.filter(item.matches).length])), [users]);
  const counties = useMemo(() => ["All", ...Array.from(new Set(users.map((user) => user.county).filter((value): value is string => Boolean(value)))).sort()], [users]);
  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const current = segments.find((item) => item.id === segment) || segments[0];
    return users.filter(current.matches).filter((user) => !query || [user.name, user.email, user.phone, user.county, user.id, user.uid].some((value) => String(value || "").toLowerCase().includes(query))).filter((user) => county === "All" || user.county === county).sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "points") return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
      return Date.parse(b.createdAt || b.joinDate || "") - Date.parse(a.createdAt || a.joinDate || "");
    });
  }, [users, segment, searchTerm, county, sort]);
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function selectSegment(id: Segment) { setSegment(id); setPage(1); }
  async function changeRole(user: User, role: "admin" | "user") {
    const id = String(user.id || user.uid); const notice = toast.loading(`Updating ${user.name}'s role...`);
    try { await updateUserRole(id, role); toast.success("Role updated", { id: notice }); } catch (error) { toast.error(error instanceof Error ? error.message : "Role update failed", { id: notice }); }
  }
  async function changeStatus(user: User) {
    const id = String(user.id || user.uid); const next = user.status === "suspended" ? "active" : "suspended";
    if (next === "suspended" && !window.confirm(`Suspend ${user.name}? They will lose access until reactivated.`)) return;
    const notice = toast.loading(`${next === "active" ? "Reactivating" : "Suspending"} ${user.name}...`);
    try { await updateUserStatus(id, next); toast.success(next === "active" ? "Customer reactivated" : "Customer suspended", { id: notice }); } catch (error) { toast.error(error instanceof Error ? error.message : "Status update failed", { id: notice }); }
  }
  async function removeUser(user: User) {
    if (!window.confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    const notice = toast.loading(`Deleting ${user.name}...`);
    try { await deleteUser(String(user.id || user.uid)); toast.success("User deleted", { id: notice }); } catch (error) { toast.error(error instanceof Error ? error.message : "Delete failed", { id: notice }); }
  }
  async function changeProfile(user: User, profile: StaffProfile) {
    const notice = toast.loading(`Assigning ${STAFF_PROFILES[profile].label}...`);
    try { await updateStaffPermissions(String(user.id || user.uid), profile, STAFF_PROFILES[profile].permissions); toast.success("Staff permissions updated", { id: notice }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Permission update failed", { id: notice }); }
  }

  return <div className="space-y-5">
    <header><p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Customer operations</p><h1 className="text-2xl font-black tracking-tight text-gray-950">Customers & staff</h1><p className="mt-1 text-sm text-gray-500">Understand customers and control account access.</p></header>
    <section aria-label="Saved customer segments" className="overflow-x-auto rounded-2xl border border-gray-200 bg-white px-2 shadow-sm"><div className="flex min-w-max gap-1" role="tablist">{segments.map((item) => <button key={item.id} type="button" role="tab" aria-selected={segment === item.id} onClick={() => selectSegment(item.id)} className={`relative min-h-12 px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${segment === item.id ? "text-green-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-green-600" : "text-gray-500 hover:text-gray-900"}`}>{item.label}<span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{counts[item.id] || 0}</span></button>)}</div></section>
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row">
        <label className="relative flex-1"><span className="sr-only">Search customers</span><svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Name, email, phone or county" className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10" /></label>
        <div className="grid grid-cols-2 gap-2"><label><span className="sr-only">County</span><select value={county} onChange={(event) => { setCounty(event.target.value); setPage(1); }} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold">{counties.map((item) => <option key={item}>{item === "All" ? "Any county" : item}</option>)}</select></label><label><span className="sr-only">Sort customers</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold"><option value="newest">Newest first</option><option value="name">Name A-Z</option><option value="points">Most loyalty points</option></select></label></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-3">Person</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Loyalty</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Staff profile</th><th className="px-4 py-3">Access</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{visibleUsers.map((user) => <tr key={user.id || user.uid} onClick={() => router.push(`/dashboard/admin/users/${user.id || user.uid}`)} className="cursor-pointer hover:bg-gray-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 font-black text-green-800">{user.name?.charAt(0).toUpperCase() || "?"}</span><span className="min-w-0"><span className="block truncate font-bold text-gray-950">{user.name || "Unnamed customer"}</span><span className="block truncate text-xs text-gray-500">{user.email || user.phone || "No contact details"}</span></span></div></td><td className="px-4 py-4 text-gray-600">{user.county || user.city || "Not provided"}</td><td className="px-4 py-4"><span className="font-black text-gray-900">{(user.loyaltyPoints || 0).toLocaleString()}</span><span className="ml-1 text-xs text-gray-400">pts</span></td><td className="px-4 py-4" onClick={(event) => event.stopPropagation()}><select value={user.role === "admin" || user.role === "super-admin" ? "admin" : "user"} disabled={user.role === "super-admin"} onChange={(event) => changeRole(user, event.target.value as "admin" | "user")} className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold ring-1 ring-inset disabled:opacity-60 ${user.role === "admin" || user.role === "super-admin" ? "bg-purple-50 text-purple-700 ring-purple-600/20" : "bg-blue-50 text-blue-700 ring-blue-600/20"}`}><option value="user">Customer</option><option value="admin">Admin</option></select></td><td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>{user.role === "admin" && actor?.role === "super-admin" ? <select value={profileForPermissions(user.adminPermissions)} onChange={(event) => changeProfile(user, event.target.value as StaffProfile)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold"><option value="custom" disabled>Custom profile</option>{Object.entries(STAFF_PROFILES).map(([id, profile]) => <option key={id} value={id}>{profile.label}</option>)}</select> : <span className="text-xs text-gray-500">{user.role === "super-admin" ? "Super administrator" : user.role === "admin" ? STAFF_PROFILES[profileForPermissions(user.adminPermissions) === "custom" ? "full" : profileForPermissions(user.adminPermissions) as StaffProfile].label : "Not staff"}</span>}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ring-inset ${user.status === "suspended" ? "bg-red-50 text-red-700 ring-red-600/20" : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"}`}>{user.status || "active"}</span></td><td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}><button type="button" disabled={user.role === "super-admin"} onClick={() => changeStatus(user)} className="rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-40">{user.status === "suspended" ? "Reactivate" : "Suspend"}</button><button type="button" disabled={user.role === "super-admin"} onClick={() => removeUser(user)} className="rounded-lg px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40">Delete</button></td></tr>)}</tbody></table></div>
      {visibleUsers.length === 0 ? <div className="px-6 py-16 text-center"><p className="font-black text-gray-900">No people in this segment</p><p className="mt-1 text-sm text-gray-500">Try another segment or clear your search.</p></div> : <footer className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold disabled:opacity-40">Previous</button><span className="px-2 text-xs font-bold">Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold disabled:opacity-40">Next</button></div></footer>}
    </section>
  </div>;
}
