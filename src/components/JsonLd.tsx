const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.melagri.com';

export default function JsonLd() {
    const orgJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Mel-Agro',
        alternateName: ['Mel Agro', 'Mel-Agri', 'Melagri'],
        description: "Kenya's premier online agrovet and digital marketplace for high-quality certified agricultural inputs, seeds, fertilizers, and tools. Fast nationwide delivery.",
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+254748970757',
            contactType: 'customer service',
            areaServed: 'KE',
            availableLanguage: ['en', 'sw'],
        },
        sameAs: [
            'https://facebook.com/Melagri',
            'https://twitter.com/Melagri',
            'https://instagram.com/Melagri',
        ],
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'Makamithi Towers, 4th Floor, Ngong Road',
            addressLocality: 'Nairobi',
            addressCountry: 'KE',
        },
    };

    const websiteJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Mel-Agro',
        url: SITE_URL,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
            />
        </>
    );
}
