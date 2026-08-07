export const ADMIN_PERMISSIONS = [
  "orders.manage", "catalogue.manage", "customers.manage", "payments.manage",
  "analytics.view", "marketing.manage", "settings.manage",
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];
export type StaffProfile = "full" | "operations" | "catalogue" | "support" | "analyst";

export const STAFF_PROFILES: Record<StaffProfile, { label: string; permissions: AdminPermission[] }> = {
  full: { label: "Full administrator", permissions: [...ADMIN_PERMISSIONS] },
  operations: { label: "Operations manager", permissions: ["orders.manage", "customers.manage", "payments.manage", "analytics.view"] },
  catalogue: { label: "Catalogue manager", permissions: ["catalogue.manage", "analytics.view", "marketing.manage"] },
  support: { label: "Customer support", permissions: ["orders.manage", "customers.manage"] },
  analyst: { label: "Analyst (read-only)", permissions: ["analytics.view"] },
};

export function hasAdminPermission(role: string | undefined, permissions: string[] | undefined, permission: AdminPermission) {
  if (role === "super-admin") return true;
  if (role !== "admin") return false;
  return !Array.isArray(permissions) || permissions.includes(permission);
}

export function profileForPermissions(permissions: string[] | undefined): StaffProfile | "custom" {
  if (!Array.isArray(permissions)) return "full";
  const normalized = [...permissions].sort().join("|");
  const match = Object.entries(STAFF_PROFILES).find(([, profile]) => [...profile.permissions].sort().join("|") === normalized);
  return (match?.[0] as StaffProfile | undefined) || "custom";
}
