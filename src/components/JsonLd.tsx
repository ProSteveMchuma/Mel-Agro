export default function JsonLd() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'MelAgro',
        url: 'https://melagro.com',
        logo: 'https://melagro.com/logo.png', // Replace with actual logo URL
        sameAs: [
            'https://facebook.com/melagro',
            'https://twitter.com/melagro',
            'https://instagram.com/melagro',
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+254700000000', // Replace with actual phone
            contactType: 'customer service',
            areaServed: 'KE',
            availableLanguage: 'en',
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
