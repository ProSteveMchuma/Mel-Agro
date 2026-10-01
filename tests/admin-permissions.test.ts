import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ADMIN_PERMISSIONS,
  STAFF_PROFILES,
  canAccessAdminPath,
  hasAdminPermission,
  permissionForAdminPath,
  profileForPermissions,
} from '../src/lib/admin-permissions.ts';

function readSource(relative: string) {
  return readFileSync(join(process.cwd(), relative), 'utf8');
}

test('super-admin retains every administrative capability', () => {
  for (const permission of ADMIN_PERMISSIONS) assert.equal(hasAdminPermission('super-admin', [], permission), true);
});

test('admins without an explicit permissions array are denied (default-deny)', () => {
  for (const permission of ADMIN_PERMISSIONS) assert.equal(hasAdminPermission('admin', undefined, permission), false);
  assert.equal(hasAdminPermission('admin', [], 'orders.manage'), false);
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
  assert.equal(profileForPermissions(undefined), 'custom');
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

test('canAccessAdminPath gates overview and command-centre shortcuts per profile', () => {
  const support = STAFF_PROFILES.support.permissions;
  const catalogue = STAFF_PROFILES.catalogue.permissions;
  const analyst = STAFF_PROFILES.analyst.permissions;

  assert.equal(canAccessAdminPath('admin', support, '/dashboard/admin'), true);
  assert.equal(canAccessAdminPath('admin', support, '/dashboard/admin/orders/create'), true);
  assert.equal(canAccessAdminPath('admin', support, '/dashboard/admin/products/new'), false);
  assert.equal(canAccessAdminPath('admin', support, '/dashboard/admin/settings'), false);
  assert.equal(canAccessAdminPath('admin', support, '/dashboard/admin/analytics'), false);

  assert.equal(canAccessAdminPath('admin', catalogue, '/dashboard/admin/products/new'), true);
  assert.equal(canAccessAdminPath('admin', catalogue, '/dashboard/admin/cms'), true);
  assert.equal(canAccessAdminPath('admin', catalogue, '/dashboard/admin/orders'), false);
  assert.equal(canAccessAdminPath('admin', catalogue, '/dashboard/admin/users'), false);

  assert.equal(canAccessAdminPath('admin', analyst, '/dashboard/admin/analytics'), true);
  assert.equal(canAccessAdminPath('admin', analyst, '/dashboard/admin/reports'), true);
  assert.equal(canAccessAdminPath('admin', analyst, '/dashboard/admin/orders'), false);
  assert.equal(canAccessAdminPath('admin', analyst, '/dashboard/admin/products'), false);

  assert.equal(canAccessAdminPath('super-admin', [], '/dashboard/admin/settings'), true);
});

test('command centre, help drawer, and overview filter UI by path permission', () => {
  const command = readSource('src/components/admin/AdminCommandCentre.tsx');
  const help = readSource('src/components/admin/AdminHelpDrawer.tsx');
  const overview = readSource('src/app/dashboard/admin/page.tsx');
  assert.match(command, /canAccessAdminPath/);
  assert.match(help, /canAccessAdminPath/);
  assert.match(overview, /canAccessAdminPath/);
  assert.match(overview, /profileLabel/);
  assert.match(overview, /canAnalytics/);
});
