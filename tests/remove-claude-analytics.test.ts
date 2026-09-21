import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd());

test('Claude AI briefing API and Anthropic dependency are removed', () => {
    assert.equal(existsSync(join(root, 'src/app/api/admin/ai-insights/route.ts')), false);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.equal(pkg.dependencies?.['@anthropic-ai/sdk'], undefined);
    assert.equal(pkg.devDependencies?.['@anthropic-ai/sdk'], undefined);
});

test('admin analytics page no longer mounts Claude briefing UI', () => {
    const source = readFileSync(join(root, 'src/app/dashboard/admin/analytics/page.tsx'), 'utf8');
    assert.equal(source.includes('ai-insights'), false);
    assert.equal(source.includes('Claude'), false);
    assert.equal(source.includes('ANTHROPIC'), false);
    assert.match(source, /What visitor data means/);
    assert.match(source, /anonymous daily counts/i);
});

test('admin home traffic labels do not claim named unique users', () => {
    const source = readFileSync(join(root, 'src/app/dashboard/admin/page.tsx'), 'utf8');
    assert.equal(source.includes('Unique Users'), false);
    assert.match(source, /Anon\. devices/);
});

test('env docs no longer advertise ANTHROPIC_API_KEY', () => {
    const envExample = readFileSync(join(root, '.env.example'), 'utf8');
    const readme = readFileSync(join(root, 'README_ENV.md'), 'utf8');
    assert.equal(envExample.includes('ANTHROPIC_API_KEY'), false);
    assert.equal(readme.includes('ANTHROPIC_API_KEY'), false);
    assert.equal(readme.includes('AI Market Briefing'), false);
});
