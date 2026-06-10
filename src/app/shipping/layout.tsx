import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Shipping Information — Rates & Delivery Times Across Kenya',
    description: 'Mel-Agri shipping rates by zone (Nairobi from KES 200, country-wide). Free delivery on orders over KES 10,000. Same-day Nairobi, 1–5 days nationwide.',
    alternates: { canonical: '/shipping' },
    openGraph: {
        title: 'Shipping & Delivery Rates | Mel-Agri',
        description: 'Free delivery over KES 10,000 nationwide. Zone-based rates from KES 200.',
        url: '/shipping',
    },
};

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
