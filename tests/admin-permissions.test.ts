import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_PERMISSIONS, STAFF_PROFILES, hasAdminPermission, profileForPermissions } from '../src/lib/admin-permissions.ts';

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
