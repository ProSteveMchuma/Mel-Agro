export default function JsonLd() {
    const orgJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Mel-Agro',
        alternateName: 'Mel Agro',
        description: 'Kenya\'s premier digital marketplace for high-quality agricultural inputs including seeds, fertilizers, and tools.',
        url: 'https://melagro.com',
        logo: 'https://melagro.com/logo.png',
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+254748970757',
            contactType: 'customer service',
            areaServed: 'KE',
            availableLanguage: 'en',
        },
        sameAs: [
            'https://facebook.com/melagro',
            'https://twitter.com/melagro',
            'https://instagram.com/melagro',
        ],
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'Makamithi Towers, 4th Floor, Ngong Road',
            addressLocality: 'Nairobi',
            addressCountry: 'KE'
        }
    };

    const websiteJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Mel-Agro',
        url: 'https://melagro.com',
        potentialAction: {
            '@type': 'SearchAction',
            target: 'https://melagro.com/products?search={search_term_string}',
            'query-input': 'required name=search_term_string'
        }
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
