import { DELIVERY_ZONES } from './delivery.ts';

/** Published zone rates for product offers. Free delivery over the threshold stays on the delivery page. */
export function kenyaOfferShippingDetails() {
    return DELIVERY_ZONES.map((zone) => ({
        '@type': 'OfferShippingDetails' as const,
        name: zone.name,
        shippingRate: {
            '@type': 'MonetaryAmount' as const,
            value: zone.price,
            currency: 'KES',
        },
        shippingDestination: {
            '@type': 'DefinedRegion' as const,
            addressCountry: 'KE',
            addressRegion: zone.isFallback ? 'Kenya' : zone.name,
        },
        deliveryTime: {
            '@type': 'ShippingDeliveryTime' as const,
            handlingTime: { '@type': 'QuantitativeValue' as const, minValue: 0, maxValue: 1, unitCode: 'DAY' },
            transitTime: {
                '@type': 'QuantitativeValue' as const,
                minValue: zone.etaMinDays,
                maxValue: zone.etaMaxDays,
                unitCode: 'DAY',
            },
        },
    }));
}
