import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const header = readFileSync(join(process.cwd(), 'src/components/Header.tsx'), 'utf8');

test('a phone tap on the profile icon opens the desktop account menu', () => {
    assert.match(header, /aria-label="Account menu"/);
    assert.match(header, /aria-haspopup="menu"/);
    assert.match(header, /touch-manipulation/);
    assert.match(header, /onClick=\{toggleAccountMenu\}/);
    assert.equal(header.includes('href={userLink}'), false);
    assert.equal(header.includes('Open your account'), false);
});

test('the account menu keeps the desktop actions and can be dismissed', () => {
    for (const label of ['Dashboard', 'My Orders', 'Wishlist', 'Admin Panel', 'Sign Out', 'Sign In', 'Create Account']) {
        assert.match(header, new RegExp(`>\\s*${label}\\s*<`));
    }
    assert.match(header, /aria-label="Dismiss account menu"/);
    assert.match(header, /document\.addEventListener\("click", handleClickOutside\)/);
    assert.match(header, /event\.key === "Escape"/);
    assert.match(header, /<SmartSearch/);
    assert.match(header, /toggleCart/);
});
