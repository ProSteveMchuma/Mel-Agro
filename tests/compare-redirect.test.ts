import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const legacyPath = '/compare/online-agrovets-kenya';

function source(path: string) {
    return readFileSync(join(root, path), 'utf8');
}

test('the compare page, its links, and its sitemap entry are gone', () => {
    assert.equal(existsSync(join(root, 'src/app/compare/online-agrovets-kenya/page.tsx')), false);
    assert.equal(source('src/app/sitemap.ts').includes(legacyPath), false);
    assert.equal(source('src/components/Footer.tsx').includes(legacyPath), false);
    assert.equal(source('src/components/Footer.tsx').includes('Compare Online Agrovets'), false);
});

test('the old compare URL permanently redirects to the homepage', () => {
    for (const path of ['next.config.ts', 'vercel.json']) {
        const file = source(path);
        assert.match(file, /\/compare\/online-agrovets-kenya/);
        assert.match(file, /permanent:\s*true|"permanent":\s*true/);
        const config = path.endsWith('.json') ? JSON.parse(file) : null;
        if (config) {
            const rules = config.redirects.filter((rule: { source: string }) => rule.source === legacyPath || rule.source === `${legacyPath}/`);
            assert.equal(rules.length, 2);
            for (const rule of rules) {
                assert.equal(rule.destination, '/');
                assert.equal(rule.permanent, true);
            }
        }
    }
    const nextConfig = source('next.config.ts');
    assert.match(nextConfig, /source:\s*'\/compare\/online-agrovets-kenya'/);
    assert.match(nextConfig, /destination:\s*'\/'/);
});
