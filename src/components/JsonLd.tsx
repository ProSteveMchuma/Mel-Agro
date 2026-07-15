import { SITE_LOGO, SITE_SOCIAL_IMAGE, SITE_URL } from '@/lib/site';

export default function JsonLd() {
    const storeId = `${SITE_URL}/#store`;
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'OnlineStore',
                '@id': storeId,
                name: 'Mel-Agri',
                alternateName: ['Mel Agro', 'Melagri'],
                description: "Kenya's online agrovet for certified seeds, fertilizers, crop protection products, and farm tools with nationwide delivery.",
                url: SITE_URL,
                logo: {
                    '@type': 'ImageObject',
                    url: SITE_LOGO,
                    contentUrl: SITE_LOGO,
                    width: 1024,
                    height: 1024,
                },
                image: SITE_SOCIAL_IMAGE,
                telephone: '+254748970757',
                email: 'support@melagri.com',
                priceRange: '$$',
                contactPoint: {
                    '@type': 'ContactPoint',
                    telephone: '+254748970757',
                    email: 'support@melagri.com',
                    contactType: 'customer service',
                    areaServed: 'KE',
                    availableLanguage: ['en', 'sw'],
                },
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'Makamithi Towers, 4th Floor, Ngong Road',
                    addressLocality: 'Nairobi',
                    addressRegion: 'Nairobi County',
                    postalCode: '00100',
                    addressCountry: 'KE',
                },
                geo: {
                    '@type': 'GeoCoordinates',
                    latitude: -1.3005,
                    longitude: 36.7869,
                },
                openingHoursSpecification: {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                    opens: '08:00',
                    closes: '18:00',
                },
                hasMerchantReturnPolicy: {
                    '@type': 'MerchantReturnPolicy',
                    applicableCountry: 'KE',
                    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnPeriod',
                    merchantReturnDays: 7,
                    returnMethod: 'https://schema.org/ReturnByMail',
                    merchantReturnLink: `${SITE_URL}/returns`,
                },
            },
            {
                '@type': 'WebSite',
                '@id': `${SITE_URL}/#website`,
                name: 'Mel-Agri',
                url: SITE_URL,
                publisher: { '@id': storeId },
                inLanguage: 'en-KE',
                potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                        '@type': 'EntryPoint',
                        urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                },
            },
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
    );
}
