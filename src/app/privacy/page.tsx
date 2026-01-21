import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-6">Privacy Policy</h1>
                    <div className="prose prose-green max-w-none text-gray-600">
                        <p className="mb-4">At Mel-Agro, we take your privacy seriously. This policy outlines how we collect, use, and protect your personal information.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">1. Information We Collect</h2>
                        <p className="mb-4">We collect information you provide directly to us, such as when you create an account, make a purchase, or contact customer support.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">2. How We Use Your Information</h2>
                        <p className="mb-4">We use your information to process your orders, communicate with you, and improve our services. We do not sell your personal data to third parties.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">3. Data Security</h2>
                        <p className="mb-4">We implement appropriate security measures to protect your personal information from unauthorized access or disclosure.</p>

                        <p className="mt-8 text-sm text-gray-400">Last updated: January 2025</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
