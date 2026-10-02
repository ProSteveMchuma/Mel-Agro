import { COMPANY_LOCALITY, COMPANY_POSTAL_CODE, COMPANY_REGION, COMPANY_STREET, SITE_DESCRIPTION, SITE_LOGO, SITE_SOCIAL_IMAGE, SITE_URL, SUPPORT_PHONE_E164 } from '@/lib/site';

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
                description: SITE_DESCRIPTION,
                url: SITE_URL,
                logo: {
                    '@type': 'ImageObject',
                    url: SITE_LOGO,
                    contentUrl: SITE_LOGO,
                    width: 1024,
                    height: 1024,
                },
                image: SITE_SOCIAL_IMAGE,
                telephone: SUPPORT_PHONE_E164,
                email: 'support@melagri.com',
                priceRange: '$$',
                contactPoint: {
                    '@type': 'ContactPoint',
                    telephone: SUPPORT_PHONE_E164,
                    email: 'support@melagri.com',
                    contactType: 'customer service',
                    areaServed: 'KE',
                    availableLanguage: ['en', 'sw'],
                },
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: COMPANY_STREET,
                    addressLocality: COMPANY_LOCALITY,
                    addressRegion: COMPANY_REGION,
                    postalCode: COMPANY_POSTAL_CODE,
                    addressCountry: 'KE',
                },
                openingHoursSpecification: [
                    {
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                        opens: '08:00',
                        closes: '18:00',
                    },
                    {
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: 'Saturday',
                        opens: '09:00',
                        closes: '16:00',
                    },
                ],
                hasMerchantReturnPolicy: {
                    '@type': 'MerchantReturnPolicy',
                    '@id': `${SITE_URL}/#return-policy`,
                    applicableCountry: 'KE',
                    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnPeriod',
                    merchantReturnDays: 7,
                    returnMethod: 'https://schema.org/ReturnByMail',
                    merchantReturnLink: `${SITE_URL}/returns`,
                },
                hasShippingService: {
                    '@type': 'ShippingService',
                    '@id': `${SITE_URL}/#kenya-delivery`,
                    name: 'Mel-Agri Kenya delivery',
                    areaServed: { '@type': 'Country', name: 'Kenya' },
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
