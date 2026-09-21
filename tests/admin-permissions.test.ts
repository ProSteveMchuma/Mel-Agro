import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_PERMISSIONS, STAFF_PROFILES, hasAdminPermission, permissionForAdminPath, profileForPermissions } from '../src/lib/admin-permissions.ts';

test('super-admin retains every administrative capability', () => {
  for (const permission of ADMIN_PERMISSIONS) assert.equal(hasAdminPermission('super-admin', [], permission), true);
});

test('legacy admins remain compatible until a profile is assigned', () => {
  for (const permission of ADMIN_PERMISSIONS) assert.equal(hasAdminPermission('admin', undefined, permission), true);
});

test('restricted staff receive only their assigned capabilities', () => {
  const support = STAFF_PROFILES.support.permissions;
  assert.equal(hasAdminPermission('admin', support, 'orders.manage'), true);
  assert.equal(hasAdminPermission('admin', support, 'customers.manage'), true);
  assert.equal(hasAdminPermission('admin', support, 'payments.manage'), false);
  assert.equal(hasAdminPermission('admin', support, 'settings.manage'), false);
});

test('customers never receive admin capabilities', () => {
  assert.equal(hasAdminPermission('user', [...ADMIN_PERMISSIONS], 'settings.manage'), false);
});

test('staff profiles are deterministically recognized', () => {
  assert.equal(profileForPermissions([...STAFF_PROFILES.operations.permissions].reverse()), 'operations');
  assert.equal(profileForPermissions(['orders.manage']), 'custom');
});

test('admin routes map to their required capability', () => {
  assert.equal(permissionForAdminPath('/dashboard/admin/orders/abc'), 'orders.manage');
  assert.equal(permissionForAdminPath('/dashboard/admin/returns'), 'orders.manage');
  assert.equal(permissionForAdminPath('/dashboard/admin/fulfillment'), 'orders.manage');
  assert.equal(permissionForAdminPath('/dashboard/admin/settings/mpesa'), 'payments.manage');
  assert.equal(permissionForAdminPath('/dashboard/admin/products/edit/abc'), 'catalogue.manage');
  assert.equal(permissionForAdminPath('/dashboard/admin/users/abc'), 'customers.manage');
  assert.equal(permissionForAdminPath('/dashboard/admin/analytics'), 'analytics.view');
  assert.equal(permissionForAdminPath('/dashboard/admin/automations'), 'settings.manage');
  assert.equal(permissionForAdminPath('/dashboard/admin'), null);
});
