import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    brandKeyFrom,
    collapseBrandDisplays,
    findNearDuplicateBrand,
    normalizeDisplayField,
    productBrandFields,
    resolveCanonicalBrand,
    resolveProductBrand,
} from '../src/lib/catalog-normalize.ts';

describe('catalog-normalize', () => {
    it('normalizes display fields', () => {
        assert.equal(normalizeDisplayField('  Mel   Agri.  '), 'Mel Agri');
        assert.equal(normalizeDisplayField(null), '');
    });

    it('maps brand variants to the same key', () => {
        assert.equal(brandKeyFrom('MEL-AGRI'), 'mel-agri');
        assert.equal(brandKeyFrom('Mel-Agri'), 'mel-agri');
        assert.equal(brandKeyFrom('mel agri'), 'mel-agri');
        assert.equal(brandKeyFrom('Mel Agri'), 'mel-agri');
    });

    it('collapses duplicate brand spellings by frequency', () => {
        const collapsed = collapseBrandDisplays([
            { brand: 'MEL-AGRI' },
            { brand: 'MEL-AGRI' },
            { brand: 'Mel-Agri' },
            { brand: 'Yara' },
            { brand: 'yara' },
            { brand: '' },
        ]);
        assert.deepEqual(collapsed, ['MEL-AGRI', 'Yara']);
    });

    it('resolves canonical brand from known displays', () => {
        assert.equal(resolveCanonicalBrand('mel agri', ['MEL-AGRI', 'Yara']), 'MEL-AGRI');
        assert.equal(resolveCanonicalBrand('  NewCo  ', ['Yara']), 'NewCo');
    });

    it('flags near-duplicate brands', () => {
        assert.equal(findNearDuplicateBrand('Mel Agri', ['MEL-AGRI']), 'MEL-AGRI');
        assert.equal(findNearDuplicateBrand('Yarra', ['Yara']), 'Yara');
        assert.equal(findNearDuplicateBrand('Bayer', ['Yara']), null);
    });

    it('builds product brand fields', () => {
        assert.deepEqual(productBrandFields('  mel-agri ', ['MEL-AGRI']), {
            brand: 'MEL-AGRI',
            brandKey: 'mel-agri',
            conflict: null,
        });
        assert.deepEqual(productBrandFields(''), { brand: '', brandKey: '', conflict: null });
    });

    it('resolveProductBrand remaps exact keys and blocks fuzzy typos', () => {
        assert.deepEqual(resolveProductBrand('mel agri', ['MEL-AGRI']), {
            ok: true,
            brand: 'MEL-AGRI',
            brandKey: 'mel-agri',
            remappedFrom: 'mel agri',
        });
        assert.deepEqual(resolveProductBrand('Yarra', ['Yara']), {
            ok: false,
            reason: 'near_duplicate',
            input: 'Yarra',
            suggestedBrand: 'Yara',
        });
        assert.deepEqual(resolveProductBrand('Yarra', ['Yara'], { forceNewBrand: true }), {
            ok: true,
            brand: 'Yarra',
            brandKey: 'yarra',
        });
        assert.deepEqual(resolveProductBrand('Bayer', ['Yara']), {
            ok: true,
            brand: 'Bayer',
            brandKey: 'bayer',
        });
    });
});
