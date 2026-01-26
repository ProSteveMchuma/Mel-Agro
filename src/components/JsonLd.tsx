export default function JsonLd() {
    const orgJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Mel-Agri',
        alternateName: 'Mel Agri',
        description: 'Kenya\'s premier digital marketplace for high-quality agricultural inputs including seeds, fertilizers, and tools.',
        url: 'https://Mel-Agri.com',
        logo: 'https://Mel-Agri.com/logo.png',
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+254748970757',
            contactType: 'customer service',
            areaServed: 'KE',
            availableLanguage: 'en',
        },
        sameAs: [
            'https://facebook.com/Mel-Agri',
            'https://twitter.com/Mel-Agri',
            'https://instagram.com/Mel-Agri',
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
        name: 'Mel-Agri',
        url: 'https://Mel-Agri.com',
        potentialAction: {
            '@type': 'SearchAction',
            target: 'https://Mel-Agri.com/products?search={search_term_string}',
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
