import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd());

test('root layout enables viewport-fit cover for notched devices', () => {
    const source = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8');
    assert.match(source, /viewportFit:\s*"cover"/);
});

test('MobileNav reserves in-flow space and exposes hidesMobileNav helper', () => {
    const source = readFileSync(join(root, 'src/components/MobileNav.tsx'), 'utf8');
    assert.match(source, /export function hidesMobileNav/);
    assert.match(source, /h-\[calc\(5\.75rem\+env\(safe-area-inset-bottom/);
    assert.match(source, /pb-safe/);
});

test('WhatsApp FAB clears sticky CTA and MobileNav with safe-area offsets', () => {
    const source = readFileSync(join(root, 'src/components/WhatsAppButton.tsx'), 'utf8');
    assert.match(source, /hidesMobileNav/);
    assert.match(source, /5\.5rem\+env\(safe-area-inset-bottom/);
    assert.match(source, /6rem\+env\(safe-area-inset-bottom/);
});

test('PDP sticky add-to-cart uses safe-area padding', () => {
    const source = readFileSync(join(root, 'src/components/ProductDetails.tsx'), 'utf8');
    assert.match(source, /pb-\[calc\(0\.75rem\+env\(safe-area-inset-bottom/);
    assert.match(source, /pb-\[calc\(6\.5rem\+env\(safe-area-inset-bottom/);
});

test('cart sticky checkout bar keeps base pad plus safe-area', () => {
    const source = readFileSync(join(root, 'src/app/cart/page.tsx'), 'utf8');
    assert.match(source, /pb-\[calc\(1rem\+env\(safe-area-inset-bottom/);
    assert.match(source, /pb-\[calc\(7rem\+env\(safe-area-inset-bottom/);
});

test('checkout stepper is flex-safe on narrow viewports', () => {
    const source = readFileSync(join(root, 'src/app/checkout/page.tsx'), 'utf8');
    assert.match(source, /min-w-0/);
    assert.match(source, /p-4 sm:p-8/);
});

test('hero and featured slider use fluid mobile heights and denser padding', () => {
    const hero = readFileSync(join(root, 'src/components/Hero.tsx'), 'utf8');
    const featured = readFileSync(join(root, 'src/components/FeaturedSlider.tsx'), 'utf8');
    assert.match(hero, /px-5 sm:px-10/);
    assert.match(hero, /text-2xl sm:text-4xl/);
    assert.match(featured, /min-h-\[320px\]/);
    assert.match(featured, /pb-14 sm:pb-16 md:pb-0/);
});

test('product card wishlist meets 44px touch target on mobile', () => {
    const source = readFileSync(join(root, 'src/components/ProductCard.tsx'), 'utf8');
    assert.match(source, /min-h-11 min-w-11/);
});

test('cart drawer footer and qty controls use safe-area and tap targets', () => {
    const source = readFileSync(join(root, 'src/components/CartDrawer.tsx'), 'utf8');
    assert.match(source, /safe-area-inset-bottom/);
    assert.match(source, /safe-area-inset-top/);
    assert.match(source, /min-h-11/);
    assert.match(source, /max-h-\[100dvh\]/);
});

test('globals clip horizontal overflow and tighten container on phones', () => {
    const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
    assert.match(css, /overflow-x:\s*clip/);
    assert.match(css, /px-4 sm:px-8/);
});
