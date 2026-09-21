import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('bulk catalog actions require catalogue.manage via Firebase ID token', () => {
    const actions = readFileSync(join(root, 'src/app/actions/bulkActions.ts'), 'utf8');
    const uploadUi = readFileSync(join(root, 'src/components/admin/BulkUploadButton.tsx'), 'utf8');
    const exportUi = readFileSync(join(root, 'src/components/admin/ExportProductsButton.tsx'), 'utf8');
    const auth = readFileSync(join(root, 'src/lib/auth-server.ts'), 'utf8');

    assert.match(auth, /export async function requirePermissionToken/);
    assert.match(actions, /requirePermissionToken/);
    assert.match(actions, /catalogue\.manage/);
    assert.match(actions, /requireCatalogueActor/);
    assert.match(uploadUi, /idToken/);
    assert.match(exportUi, /getAllProducts\(idToken\)/);
});

test('ungated bulk upload entry points no longer exist', () => {
    const actions = readFileSync(join(root, 'src/app/actions/bulkActions.ts'), 'utf8');
    // Auth must run before any Admin SDK product writes.
    const authIndex = actions.indexOf('requireCatalogueActor');
    const batchIndex = actions.indexOf('adminDb.batch()');
    const exportIndex = actions.indexOf('export async function getAllProducts');
    assert.ok(authIndex > 0 && batchIndex > authIndex, 'upload must authenticate before batch writes');
    assert.match(actions.slice(exportIndex, exportIndex + 400), /requireCatalogueActor/);
});
