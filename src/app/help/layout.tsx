import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Help Center & FAQs',
    description: 'Get answers about ordering, shipping, payment via M-Pesa, returns, and account management on Mel-Agri.',
    alternates: { canonical: '/help' },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
