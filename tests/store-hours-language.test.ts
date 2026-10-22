import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function source(path: string) {
    return readFileSync(join(root, path), 'utf8');
}

test('structured data uses the contact-page hours and English only', () => {
    const contact = source('src/lib/cms-marketing.ts');
    const structured = source('src/components/JsonLd.tsx');
    assert.match(contact, /Monday – Friday, 8am – 5pm/);
    assert.match(structured, /opens: '08:00'/);
    assert.match(structured, /closes: '17:00'/);
    assert.equal(structured.includes('Saturday'), false);
    assert.equal(structured.includes('18:00'), false);
    assert.match(structured, /availableLanguage: \['en'\]/);
    assert.equal(structured.includes("'sw'"), false);
});
