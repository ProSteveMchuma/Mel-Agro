"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsPage() {
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header />
            <main className="flex-grow pb-24">
                {/* Hero Section */}
                <div className="bg-gray-50 py-16 border-b border-gray-100">
                    <div className="container-custom">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms & Conditions</h1>
                        <p className="text-lg text-gray-600 max-w-2xl">
                            Please read these terms and conditions carefully before using the Mel-Agri platform.
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="container-custom py-16">
                    <div className="max-w-4xl mx-auto prose prose-green prose-lg">
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">1. Introduction</h2>
                            <p className="text-gray-600 mb-4">
                                Welcome to Mel-Agri. By accessing or using our website and services, you agree to be bound by these terms and conditions. These terms apply to all visitors, users, and others who access or use the service.
                            </p>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">2. Use of Services</h2>
                            <p className="text-gray-600 mb-4">
                                You agree to use Mel-Agri services only for lawful purposes related to agricultural activities. You are responsible for maintaining the confidentiality of your account credentials.
                            </p>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">3. Product Information & Pricing</h2>
                            <p className="text-gray-600 mb-4">
                                While we strive for accuracy, Mel-Agri does not warrant that product descriptions, pricing, or other content is error-free. We reserve the right to correct any errors, inaccuracies, or omissions and to change or update information at any time without prior notice.
                            </p>
                            <div className="bg-melagri-primary/5 p-6 rounded-2xl border border-melagri-primary/10 text-sm text-gray-700">
                                <strong>Note:</strong> Agricultural product performance may vary based on environmental factors, soil quality, and farming practices. Advice provided by Mel-Agri is for guidance only.
                            </div>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">4. Payments & Delivery</h2>
                            <p className="text-gray-600 mb-4">
                                All payments must be made through our authorized payment channels (M-Pesa, Credit/Debit Cards). Delivery is subject to the conditions outlined in our Shipping Policy. We reserve the right to refuse service or cancel orders at our discretion.
                            </p>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">5. Intellectual Property</h2>
                            <p className="text-gray-600 mb-4">
                                All content, including logos, designs, text, and graphics on the Mel-Agri platform, is the property of Mel-Agri and is protected by intellectual property laws.
                            </p>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">6. Limitation of Liability</h2>
                            <p className="text-gray-600 mb-4">
                                In no event shall Mel-Agri be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of our products or services.
                            </p>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">7. Changes to Terms</h2>
                            <p className="text-gray-600 mb-4">
                                We reserve the right to modify these terms at any time. Your continued use of the platform after such changes constitutes your acceptance of the new terms.
                            </p>
                        </section>

                        <div className="pt-12 border-t border-gray-100 text-sm text-gray-500">
                            Last updated: January 20, 2026
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
