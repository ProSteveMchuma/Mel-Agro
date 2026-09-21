import { SITE_NAME } from './site.ts';

/** In-store collection point shown at checkout for pickup orders. */
export const PICKUP_STORE = {
    name: `${SITE_NAME} Collection Point`,
    label: 'Makamithi Towers, 4th Floor, Ngong Road',
    county: 'Nairobi',
    town: 'Nairobi',
    address: 'Makamithi Towers, 4th Floor, Ngong Road',
    etaText: 'Ready for collection in 1–2 hours',
} as const;
