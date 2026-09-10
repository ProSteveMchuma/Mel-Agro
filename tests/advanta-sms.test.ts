import test from 'node:test';
import assert from 'node:assert/strict';
import {
    formatAdvantaMobile,
    getAdvantaConfig,
    isAdvantaConfigured,
    parseAdvantaSendResponse,
} from '../src/lib/advanta-sms.ts';

test('normalizes Kenyan numbers to Advanta 254 format', () => {
    assert.equal(formatAdvantaMobile('0712 345 678'), '254712345678');
    assert.equal(formatAdvantaMobile('+254712345678'), '254712345678');
    assert.equal(formatAdvantaMobile('254712345678'), '254712345678');
    assert.equal(formatAdvantaMobile('712345678'), '254712345678');
});

test('treats Advanta as configured when key and partner exist, defaulting sender to Makamithi', () => {
    assert.equal(isAdvantaConfigured({}), false);
    assert.equal(isAdvantaConfigured({
        ADVANTA_API_KEY: 'key',
        ADVANTA_PARTNER_ID: '12763',
    }), true);
    assert.equal(getAdvantaConfig({
        ADVANTA_API_KEY: 'key',
        ADVANTA_PARTNER_ID: '12763',
    }).shortcode, 'Makamithi');
    assert.equal(getAdvantaConfig({
        ADVANTA_API_KEY: 'key',
        ADVANTA_PARTNER_ID: '12763',
        ADVANTA_SENDER_ID: 'MELAGRI',
    }).shortcode, 'MELAGRI');
});

test('parses Advanta success and the documented misspelled response-code field', () => {
    assert.deepEqual(parseAdvantaSendResponse({
        responses: [{
            'response-code': 200,
            'response-description': 'Success',
            messageid: 8290842,
        }],
    }), { ok: true, messageId: '8290842' });

    assert.equal(parseAdvantaSendResponse({
        responses: [{
            'respose-code': 1006,
            'response-description': 'Invalid credentials',
        }],
    }).ok, false);
});
