import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    builtinStaffRoles,
    isBuiltinRoleId,
    labelForStaffAssignment,
    normalizePermissionList,
    PERMISSION_OPTIONS,
} from '../src/lib/staff-roles.ts';
import { ADMIN_PERMISSIONS } from '../src/lib/admin-permissions.ts';

test('permission checkbox options cover every admin capability exactly once', () => {
    assert.equal(PERMISSION_OPTIONS.length, ADMIN_PERMISSIONS.length);
    assert.deepEqual(
        PERMISSION_OPTIONS.map((item) => item.id).sort(),
        [...ADMIN_PERMISSIONS].sort(),
    );
});

test('builtin roles mirror STAFF_PROFILES and cannot be deleted by id check', () => {
    const builtins = builtinStaffRoles();
    assert.ok(builtins.length >= 5);
    assert.equal(builtins.every((role) => role.source === 'builtin'), true);
    assert.equal(isBuiltinRoleId('operations'), true);
    assert.equal(isBuiltinRoleId('pickup-desk'), false);
});

test('normalizePermissionList drops unknown keys and preserves order of ADMIN_PERMISSIONS', () => {
    assert.deepEqual(
        normalizePermissionList(['payments.manage', 'not.real', 'orders.manage', 'orders.manage']),
        ['orders.manage', 'payments.manage'],
    );
});

test('labelForStaffAssignment prefers catalog role then falls back', () => {
    const roles = builtinStaffRoles();
    assert.equal(labelForStaffAssignment(roles, { role: 'super-admin' }), 'Super administrator');
    assert.equal(labelForStaffAssignment(roles, { role: 'admin', staffProfile: 'support' }), 'Customer support');
    assert.equal(labelForStaffAssignment(roles, { role: 'admin', staffProfile: 'missing' }), 'Custom profile');
    assert.equal(labelForStaffAssignment(roles, { role: 'user' }), 'Not staff');
});

test('staff-roles API and page exist for super-admin role builder', () => {
    const api = readFileSync(join(process.cwd(), 'src/app/api/admin/staff-roles/route.ts'), 'utf8');
    const page = readFileSync(join(process.cwd(), 'src/app/dashboard/admin/settings/staff-roles/page.tsx'), 'utf8');
    assert.match(api, /requireSuperAdmin|role !== 'super-admin'/);
    assert.match(api, /staffRoles/);
    assert.match(page, /PERMISSION_OPTIONS/);
    assert.match(page, /type="checkbox"/);
});
