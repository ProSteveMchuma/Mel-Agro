import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';
import { whatsAppUrl, SUPPORT_PHONE_E164, SUPPORT_PHONE_DISPLAY } from '@/lib/site';
import ContactForm from '@/components/ContactForm';
import MarketingPageView from '@/components/cms/MarketingPageView';
import { getLiveCmsPage } from '@/lib/cms-pages-server';
import type { MarketingBlocksPage } from '@/lib/cms-marketing';

export const metadata: Metadata = {
    title: 'Agrovet Customer Support & Location in Nairobi',
    description:
        'Get in touch with Mel-Agri for inquiries about crop fertilizers, hybrid seeds, and bulk farm orders. Reach our agronomy support team in Nairobi via Phone, Email or WhatsApp.',
    alternates: { canonical: '/contact' },
    openGraph: {
        title: 'Contact Mel-Agri | Agrovet Customer Support & Location Nairobi',
        description: 'Reach our agronomy team in Nairobi — phone, WhatsApp, email. Located at Makamithi Towers.',
        url: '/contact',
    },
};

export default async function ContactPage() {
    const { content } = await getLiveCmsPage('contact');

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />
            <main className="flex-grow py-12 px-4">
                <div className="mx-auto max-w-7xl space-y-12">
                    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:p-10">
                        <MarketingPageView content={content as MarketingBlocksPage} />
                    </div>

                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                        <div className="rounded-2xl border border-gray-200 bg-white p-8">
                            <h2 className="mb-8 text-2xl font-bold text-gray-900">Send us a message</h2>
                            <ContactForm />
                        </div>

                        <div className="space-y-6">
                            <div className="h-full rounded-2xl border border-gray-200 bg-white p-8">
                                <h3 className="mb-6 text-xl font-bold text-gray-900">Contact Information</h3>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-sm font-bold uppercase text-gray-500">Phone Support</p>
                                        <p className="text-lg font-bold text-gray-900">{SUPPORT_PHONE_DISPLAY}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold uppercase text-gray-500">Email</p>
                                        <p className="text-lg font-bold text-gray-900">support@melagri.com</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold uppercase text-gray-500">Address</p>
                                        <p className="font-semibold text-gray-900">Makamithi Towers, 4th Floor</p>
                                        <p className="font-semibold text-gray-900">Ngong Road, Nairobi, Kenya</p>
                                    </div>
                                </div>
                                <div className="mt-8 space-y-3">
                                    <Link
                                        href={whatsAppUrl()}
                                        target="_blank"
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-bold text-white transition-colors hover:bg-green-600"
                                    >
                                        Chat on WhatsApp
                                    </Link>
                                    <Link
                                        href={`tel:${SUPPORT_PHONE_E164}`}
                                        className="flex w-full items-center justify-center rounded-lg border border-gray-200 px-6 py-3 font-bold text-gray-800 hover:bg-gray-50"
                                    >
                                        Call support
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
