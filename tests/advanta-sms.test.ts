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

test('treats Advanta as configured only when key, partner, and sender exist', () => {
    assert.equal(isAdvantaConfigured({}), false);
    assert.equal(isAdvantaConfigured({
        ADVANTA_API_KEY: 'key',
        ADVANTA_PARTNER_ID: '12763',
    }), false);
    assert.equal(isAdvantaConfigured({
        ADVANTA_API_KEY: 'key',
        ADVANTA_PARTNER_ID: '12763',
        ADVANTA_SENDER_ID: 'MELAGRI',
    }), true);
    assert.equal(getAdvantaConfig({
        ADVANTA_API_KEY: 'key',
        ADVANTA_PARTNER_ID: '12763',
        AFRICASTALKING_SENDER_ID: 'MELAGRO',
    }).shortcode, 'MELAGRO');
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
