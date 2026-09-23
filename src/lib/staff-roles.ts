import {
    ADMIN_PERMISSIONS,
    type AdminPermission,
    STAFF_PROFILES,
    type StaffProfile,
} from './admin-permissions.ts';

export type StaffRoleSource = 'builtin' | 'custom';

export interface StaffRoleDefinition {
    id: string;
    label: string;
    description?: string;
    permissions: AdminPermission[];
    source: StaffRoleSource;
    updatedAt?: string;
    updatedBy?: string | null;
}

/** Human labels for the checkbox UI — capability keys stay fixed in code. */
export const PERMISSION_OPTIONS: Array<{
    id: AdminPermission;
    label: string;
    group: string;
    help: string;
}> = [
    {
        id: 'orders.manage',
        label: 'Orders & fulfillment',
        group: 'Commerce',
        help: 'Orders, returns, fulfillment desk, logistics',
    },
    {
        id: 'payments.manage',
        label: 'Payments',
        group: 'Commerce',
        help: 'Record payments, M-Pesa tools, payment settings',
    },
    {
        id: 'catalogue.manage',
        label: 'Catalogue & inventory',
        group: 'Catalogue',
        help: 'Products, stock, discounts, reviews',
    },
    {
        id: 'customers.manage',
        label: 'Customers & support',
        group: 'Customers',
        help: 'Customer directory, messages, support tools',
    },
    {
        id: 'marketing.manage',
        label: 'Marketing & CMS',
        group: 'Customers',
        help: 'Newsletter, website content blocks',
    },
    {
        id: 'analytics.view',
        label: 'Analytics',
        group: 'Intelligence',
        help: 'Analytics, reports, intelligence dashboards',
    },
    {
        id: 'settings.manage',
        label: 'Settings & automations',
        group: 'System',
        help: 'Store settings and automation rules',
    },
];

export function builtinStaffRoles(): StaffRoleDefinition[] {
    return (Object.keys(STAFF_PROFILES) as StaffProfile[]).map((id) => ({
        id,
        label: STAFF_PROFILES[id].label,
        description: 'Built-in Mel-Agri profile',
        permissions: [...STAFF_PROFILES[id].permissions],
        source: 'builtin' as const,
    }));
}

export function normalizePermissionList(raw: unknown): AdminPermission[] {
    if (!Array.isArray(raw)) return [];
    const allowed = new Set<string>(ADMIN_PERMISSIONS);
    const unique = new Set<AdminPermission>();
    for (const entry of raw) {
        const key = String(entry || '').trim();
        if (allowed.has(key)) unique.add(key as AdminPermission);
    }
    return ADMIN_PERMISSIONS.filter((permission) => unique.has(permission));
}

export function isBuiltinRoleId(id: string): boolean {
    return Object.prototype.hasOwnProperty.call(STAFF_PROFILES, id);
}

export function findRoleInCatalog(
    roles: StaffRoleDefinition[],
    roleId: string | null | undefined,
): StaffRoleDefinition | undefined {
    if (!roleId) return undefined;
    return roles.find((role) => role.id === roleId);
}

export function labelForStaffAssignment(
    roles: StaffRoleDefinition[],
    args: { role?: string; staffProfile?: string; adminPermissions?: string[] },
): string {
    if (args.role === 'super-admin') return 'Super administrator';
    const assigned = findRoleInCatalog(roles, args.staffProfile);
    if (assigned) return assigned.label;
    if (args.role === 'admin') return 'Custom profile';
    return 'Not staff';
}
