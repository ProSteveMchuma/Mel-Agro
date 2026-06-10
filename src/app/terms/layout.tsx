import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms & Conditions',
    description: 'The terms and conditions governing your use of Mel-Agri and purchase of agricultural inputs through our platform.',
    alternates: { canonical: '/terms' },
    robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
