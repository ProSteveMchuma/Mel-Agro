import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="bg-makamithi-green text-white py-20 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-makamithi-dark to-makamithi-accent opacity-50"></div>
                    <div className="container-custom relative z-10">
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-6">About Makamithi</h1>
                        <p className="text-xl max-w-2xl mx-auto text-gray-100">
                            Empowering farmers with quality inputs, expert knowledge, and sustainable solutions.
                        </p>
                    </div>
                </section>

                {/* Our Story */}
                <section className="py-16 bg-white">
                    <div className="container-custom">
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="md:w-1/2">
                                <div className="bg-gray-200 h-96 rounded-2xl w-full flex items-center justify-center text-gray-400">
                                    <span className="text-2xl">Team Image Placeholder</span>
                                </div>
                            </div>
                            <div className="md:w-1/2">
                                <h2 className="text-3xl font-bold text-makamithi-dark mb-6">Our Story</h2>
                                <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
                                    <p>
                                        Makamithi was founded with a simple yet powerful vision: to transform agriculture in Kenya by bridging the gap between farmers and quality inputs.
                                    </p>
                                    <p>
                                        We understand the challenges farmers face – from unpredictable weather to lack of access to reliable seeds and fertilizers. That's why we've built a platform that not only supplies products but also provides the "know-how" to use them effectively.
                                    </p>
                                    <p>
                                        Today, we are proud to serve thousands of farmers across the country, helping them increase yields, improve livelihoods, and contribute to national food security.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission & Vision */}
                <section className="py-16 bg-gray-50">
                    <div className="container-custom">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="bg-makamithi-light/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-makamithi-green">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Mission</h2>
                                <p className="text-gray-600 leading-relaxed">
                                    To provide high-quality agricultural inputs and expert advisory services that empower farmers to maximize their productivity and profitability in a sustainable manner.
                                </p>
                            </div>

                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="bg-makamithi-light/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-makamithi-green">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Vision</h2>
                                <p className="text-gray-600 leading-relaxed">
                                    To be the leading partner in agribusiness, recognized for innovation, reliability, and our contribution to a food-secure Africa.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
