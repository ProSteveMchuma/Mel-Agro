"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { PERMISSION_OPTIONS, type StaffRoleDefinition } from "@/lib/staff-roles";
import type { AdminPermission } from "@/lib/admin-permissions";

const emptyForm = {
    label: "",
    description: "",
    permissions: [] as AdminPermission[],
};

export default function StaffRolesPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === "super-admin";
    const [roles, setRoles] = useState<StaffRoleDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");

    const loadRoles = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const token = await getAuth().currentUser?.getIdToken();
            if (!token) throw new Error("Admin session is unavailable.");
            const response = await fetch("/api/admin/staff-roles", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Could not load staff roles.");
            setRoles(Array.isArray(result.roles) ? result.roles : []);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not load staff roles.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRoles();
    }, [loadRoles]);

    const builtin = useMemo(() => roles.filter((role) => role.source === "builtin"), [roles]);
    const custom = useMemo(() => roles.filter((role) => role.source === "custom"), [roles]);

    function startCreate() {
        setEditingId(null);
        setForm(emptyForm);
    }

    function startEdit(role: StaffRoleDefinition) {
        if (role.source === "builtin") {
            setEditingId(null);
            setForm({
                label: `${role.label} (copy)`,
                description: role.description || "",
                permissions: [...role.permissions],
            });
            toast.success("Cloned built-in profile — save to create a custom role.");
            return;
        }
        setEditingId(role.id);
        setForm({
            label: role.label,
            description: role.description || "",
            permissions: [...role.permissions],
        });
    }

    function togglePermission(permission: AdminPermission) {
        setForm((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(permission)
                ? prev.permissions.filter((item) => item !== permission)
                : [...prev.permissions, permission],
        }));
    }

    async function onSubmit(event: FormEvent) {
        event.preventDefault();
        if (!isSuperAdmin) return;
        if (!form.label.trim() || form.permissions.length === 0) {
            toast.error("Name the role and tick at least one permission.");
            return;
        }
        setSaving(true);
        const notice = toast.loading(editingId ? "Updating role…" : "Creating role…");
        try {
            const token = await getAuth().currentUser?.getIdToken();
            if (!token) throw new Error("Admin session is unavailable.");
            const response = await fetch("/api/admin/staff-roles", {
                method: editingId ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(
                    editingId
                        ? {
                            id: editingId,
                            label: form.label.trim(),
                            description: form.description.trim(),
                            permissions: form.permissions,
                        }
                        : {
                            label: form.label.trim(),
                            description: form.description.trim(),
                            permissions: form.permissions,
                        },
                ),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Could not save role.");
            toast.success(editingId ? "Role updated" : "Role created", { id: notice });
            startCreate();
            await loadRoles();
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Save failed", { id: notice });
        } finally {
            setSaving(false);
        }
    }

    async function removeRole(role: StaffRoleDefinition) {
        if (role.source === "builtin") return;
        if (!window.confirm(`Delete role “${role.label}”? Staff using it must be reassigned first.`)) return;
        const notice = toast.loading("Deleting role…");
        try {
            const token = await getAuth().currentUser?.getIdToken();
            if (!token) throw new Error("Admin session is unavailable.");
            const response = await fetch("/api/admin/staff-roles", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ id: role.id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Could not delete role.");
            toast.success("Role deleted", { id: notice });
            if (editingId === role.id) startCreate();
            await loadRoles();
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Delete failed", { id: notice });
        }
    }

    if (!isSuperAdmin) {
        return (
            <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                <h1 className="text-xl font-black text-amber-950">Super-admin only</h1>
                <p className="mt-2 text-sm text-amber-900">
                    Only a super-admin can create or edit staff roles. Ask the store owner if you need a new profile.
                </p>
                <Link href="/dashboard/admin/users" className="mt-6 inline-flex font-bold text-green-800 underline">
                    Back to customers &amp; staff
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <header>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Access control</p>
                    <h1 className="text-2xl font-black tracking-tight text-gray-950">Staff roles</h1>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Build named roles by ticking permissions. Assign them on Customers &amp; staff. Capability keys stay fixed — you only choose which ones each role gets.
                    </p>
                </header>
                <Link href="/dashboard/admin/users" className="text-sm font-bold text-green-800 underline">
                    Assign roles to people →
                </Link>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}{" "}
                    <button type="button" onClick={() => void loadRoles()} className="font-black underline">
                        Retry
                    </button>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Built-in profiles</h2>
                        <ul className="mt-4 space-y-3">
                            {builtin.map((role) => (
                                <li key={role.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-bold text-gray-950">{role.label}</p>
                                            <p className="mt-1 text-xs text-gray-500">{role.permissions.join(" · ")}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => startEdit(role)}
                                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-green-800 hover:bg-green-50"
                                        >
                                            Clone
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Custom roles</h2>
                            <button type="button" onClick={startCreate} className="text-xs font-bold text-green-800 underline">
                                New role
                            </button>
                        </div>
                        {loading ? (
                            <p className="mt-4 text-sm text-gray-500">Loading…</p>
                        ) : custom.length === 0 ? (
                            <p className="mt-4 text-sm text-gray-500">No custom roles yet. Create one with the form.</p>
                        ) : (
                            <ul className="mt-4 space-y-3">
                                {custom.map((role) => (
                                    <li key={role.id} className="rounded-xl border border-gray-100 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-bold text-gray-950">{role.label}</p>
                                                {role.description ? (
                                                    <p className="mt-0.5 text-xs text-gray-500">{role.description}</p>
                                                ) : null}
                                                <p className="mt-1 text-xs text-gray-500">{role.permissions.join(" · ") || "No permissions"}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(role)}
                                                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void removeRole(role)}
                                                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
                    <h2 className="text-lg font-black text-gray-950">
                        {editingId ? "Edit custom role" : "Create custom role"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Tick the areas this role may open in the admin portal.</p>
                    <form onSubmit={onSubmit} className="mt-5 space-y-4">
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-500">
                            Role name
                            <input
                                value={form.label}
                                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                                placeholder="e.g. Pickup desk"
                                className="mt-2 min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-semibold"
                                required
                            />
                        </label>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-500">
                            Description
                            <input
                                value={form.description}
                                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                                placeholder="Optional short note"
                                className="mt-2 min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-semibold"
                            />
                        </label>

                        <fieldset>
                            <legend className="text-xs font-black uppercase tracking-widest text-gray-500">Permissions</legend>
                            <div className="mt-3 space-y-4">
                                {Array.from(new Set(PERMISSION_OPTIONS.map((item) => item.group))).map((group) => (
                                    <div key={group}>
                                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{group}</p>
                                        <ul className="space-y-2">
                                            {PERMISSION_OPTIONS.filter((item) => item.group === group).map((item) => {
                                                const checked = form.permissions.includes(item.id);
                                                return (
                                                    <li key={item.id}>
                                                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => togglePermission(item.id)}
                                                                className="mt-1 h-4 w-4 accent-green-700"
                                                            />
                                                            <span>
                                                                <span className="block text-sm font-bold text-gray-950">{item.label}</span>
                                                                <span className="block text-xs text-gray-500">{item.help}</span>
                                                            </span>
                                                        </label>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </fieldset>

                        <div className="flex flex-wrap gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="min-h-11 rounded-xl bg-green-700 px-5 text-sm font-black text-white disabled:opacity-50"
                            >
                                {saving ? "Saving…" : editingId ? "Save changes" : "Create role"}
                            </button>
                            {(editingId || form.label || form.permissions.length > 0) && (
                                <button
                                    type="button"
                                    onClick={startCreate}
                                    className="min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-700"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}
