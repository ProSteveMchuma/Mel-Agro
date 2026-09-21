import { SITE_NAME } from './site.ts';

/** In-store collection is available in Machakos only. */
export const PICKUP_STORE = {
    name: `${SITE_NAME} Machakos Collection Point`,
    label: 'Machakos Town, Machakos County',
    county: 'Machakos',
    town: 'Machakos',
    address: 'Machakos Town collection point',
    etaText: 'Ready for collection in 1–2 hours',
    availabilityNote: 'Pickup is available in Machakos only',
} as const;
