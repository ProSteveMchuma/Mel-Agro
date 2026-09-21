import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Shipping Information — Redirecting to Delivery',
    description: 'Mel-Agri shipping and delivery rates. This page redirects to Delivery Information.',
    alternates: { canonical: '/delivery' },
    robots: { index: false, follow: true },
};

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
