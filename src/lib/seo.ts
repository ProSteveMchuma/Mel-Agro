export function slugifySeoValue(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function resolveSeoValue(slug: string, values: string[]): string | undefined {
    return values.find(value => slugifySeoValue(value) === slugifySeoValue(slug));
}

export function productSeoSlug(product: { id: string | number; name: string }): string {
    return `${slugifySeoValue(product.name) || 'product'}--${encodeURIComponent(String(product.id))}`;
}

export function productSeoPath(product: { id: string | number; name: string }): string {
    return `/products/${productSeoSlug(product)}`;
}

export function productIdFromRouteParam(param: string): string {
    const separator = param.lastIndexOf('--');
    return decodeURIComponent(separator >= 0 ? param.slice(separator + 2) : param);
}

type CategoryEditorial = {
    eyebrow: string;
    summary: string;
    guidance: string[];
    faq: Array<{ question: string; answer: string }>;
};

const CATEGORY_EDITORIAL: Record<string, CategoryEditorial> = {
    seeds: {
        eyebrow: 'Plan the next planting window',
        summary: 'Compare seed varieties and pack sizes available for delivery across Kenya. Check the crop, maturity information, pack label, and suitability details before choosing a variety for your farm.',
        guidance: ['Match the variety to your crop and intended planting window.', 'Compare pack size, expected acreage coverage, and current availability.', 'Confirm local suitability with the registered label or a qualified agronomist.'],
        faq: [{ question: 'Can I order seeds for delivery outside Nairobi?', answer: 'Yes. Available products can be delivered to counties across Kenya; the checkout shows the exact charge and delivery estimate for your location.' }, { question: 'How should I choose a seed variety?', answer: 'Start with crop, county, planting window, maturity needs, and the information on the registered pack. Ask a qualified agronomist when local conditions make the choice uncertain.' }],
    },
    fertilizers: {
        eyebrow: 'Build a better nutrient plan',
        summary: 'Browse planting, top-dressing, foliar, and specialty fertilizer products from the Mel-Agri catalogue. Compare formulation, pack size, availability, and manufacturer guidance.',
        guidance: ['Use a soil test and crop stage to guide nutrient decisions.', 'Compare formulation and pack size rather than price alone.', 'Follow the registered label and seek agronomic advice for application rates.'],
        faq: [{ question: 'Which fertilizer is right for my crop?', answer: 'The right choice depends on crop, growth stage, soil condition, and nutrient requirements. Use soil-test evidence and qualified agronomic guidance rather than a generic rate.' }, { question: 'Are fertilizer prices shown online?', answer: 'Yes. Current catalogue prices and available pack options are shown on each product page, subject to stock updates.' }],
    },
    'crop-protection-products': {
        eyebrow: 'Shop with label-first safety',
        summary: 'Find registered crop-protection products in the live catalogue and compare product type, pack size, brand, and availability. Product selection must be based on the target problem and registered label.',
        guidance: ['Identify the target pest, disease, or weed before selecting a product.', 'Read the registered label, precautions, pre-harvest interval, and protective-equipment requirements.', 'Do not infer tank mixes or dosage from product suggestions; consult a qualified agronomist.'],
        faq: [{ question: 'Can Mel-Agri recommend a pesticide dosage online?', answer: 'No. Dosage and mixing decisions must follow the registered product label and qualified agronomic advice.' }, { question: 'Why are some products unavailable?', answer: 'The catalogue reflects current stock status. Unavailable products remain visible only when the page can still provide useful product information.' }],
    },
    'animal-health': {
        eyebrow: 'Support responsible animal care',
        summary: 'Browse animal-health products by brand, product type, pack size, and current availability. Diagnosis, dosage, withdrawal periods, and treatment decisions require a qualified veterinary professional and the registered label.',
        guidance: ['Seek a qualified diagnosis before choosing a treatment product.', 'Check species, indication, withdrawal period, storage, and label directions.', 'Never substitute catalogue suggestions for veterinary advice.'],
        faq: [{ question: 'Can I get veterinary diagnosis through the website?', answer: 'No. The website supports product discovery and ordering, but diagnosis and treatment decisions require a qualified veterinary professional.' }, { question: 'Does Mel-Agri deliver animal-health products countrywide?', answer: 'Eligible stocked products can be delivered across Kenya. Checkout provides the location-specific charge and estimate.' }],
    },
    'veterinary-products': {
        eyebrow: 'Verified products, professional decisions',
        summary: 'Explore veterinary products available from Mel-Agri while keeping clinical decisions with qualified professionals. Compare brands, pack formats, availability, and registered product information.',
        guidance: ['Confirm the animal species and professional diagnosis.', 'Follow registered label directions and withdrawal periods.', 'Contact a veterinarian for dosage, treatment, or substitution decisions.'],
        faq: [{ question: 'Do product listings replace veterinary advice?', answer: 'No. Listings help with product discovery only. A veterinarian should make diagnosis, dosage, and treatment decisions.' }, { question: 'How do I see current stock?', answer: 'Each product page shows its current availability and selectable pack options where provided.' }],
    },
    'animal-feeds': {
        eyebrow: 'Compare feeds by production need',
        summary: 'Browse animal-feed products and compare intended use, pack size, brand, price, and availability. Introduce or change feeding programmes with appropriate nutritional guidance.',
        guidance: ['Match feed to animal type, age, and production stage.', 'Compare pack size and manufacturer feeding information.', 'Use a qualified nutritionist for ration formulation or major feed changes.'],
        faq: [{ question: 'Can feeds be delivered to my county?', answer: 'Eligible stocked feeds can be delivered across Kenya, with the exact charge and delivery estimate calculated at checkout.' }, { question: 'How should I compare animal feeds?', answer: 'Compare intended animal and stage, declared nutritional information, pack size, manufacturer guidance, and cost per usable unit.' }],
    },
    minerals: {
        eyebrow: 'Targeted mineral support',
        summary: 'Compare livestock mineral products by intended use, format, pack size, brand, price, and availability. Use declared composition and professional nutritional guidance when selecting supplements.',
        guidance: ['Match the supplement to animal type and production stage.', 'Review declared composition and feeding directions.', 'Consult a nutritionist or veterinarian where deficiency or illness is suspected.'],
        faq: [{ question: 'How do I choose a livestock mineral?', answer: 'Use animal type, production stage, diet, declared composition, and professional guidance. Suspected deficiencies require qualified assessment.' }, { question: 'Are different pack sizes available?', answer: 'Available pack variants and their prices are shown on each product page.' }],
    },
    'tools-and-equipments': {
        eyebrow: 'Equip the job properly',
        summary: 'Browse practical farm tools and equipment for field, livestock, handling, and maintenance work. Compare purpose, specifications, durability features, price, and availability.',
        guidance: ['Choose the tool for the actual task and working conditions.', 'Check dimensions, capacity, compatible parts, and safety requirements.', 'Compare lifecycle value and availability of consumables or spares.'],
        faq: [{ question: 'How do I confirm a tool is suitable?', answer: 'Review the product specifications, capacity, intended task, and compatibility details. Contact Mel-Agri when a required specification is not listed.' }, { question: 'Do you deliver farm equipment?', answer: 'Eligible catalogue items can be delivered across Kenya. Large or special items may require a confirmed delivery quotation.' }],
    },
    'public-health': {
        eyebrow: 'Responsible public-health supply',
        summary: 'Browse public-health products available through Mel-Agri and compare intended use, brand, pack size, registered directions, and availability.',
        guidance: ['Confirm the approved intended use before purchase.', 'Follow all registered handling, storage, and application directions.', 'Use trained personnel where a product or intervention requires them.'],
        faq: [{ question: 'Can the website prescribe public-health chemicals?', answer: 'No. Product selection and application must follow registered directions and any applicable professional or regulatory requirements.' }, { question: 'Where can I confirm delivery cost?', answer: 'Enter your delivery county at checkout to see the applicable charge and estimated delivery range.' }],
    },
};

export function categoryEditorial(category: string): CategoryEditorial {
    return CATEGORY_EDITORIAL[slugifySeoValue(category)] || {
        eyebrow: 'A clearer way to compare farm inputs',
        summary: `Browse ${category} available from Mel-Agri and compare verified catalogue details, brands, prices, pack options, and current availability.`,
        guidance: ['Confirm the product is intended for your use case.', 'Compare specifications, pack size, availability, and total delivered cost.', 'Follow registered labels and qualified professional advice where required.'],
        faq: [{ question: `Can ${category} be delivered across Kenya?`, answer: 'Eligible stocked products can be delivered across Kenya. Checkout shows the exact location-specific charge and estimate.' }],
    };
}
