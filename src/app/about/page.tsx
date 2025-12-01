"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Header />

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative py-24 lg:py-32 bg-melagro-primary overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-green-600 opacity-90"></div>
                    <div className="absolute inset-0 bg-[url('/images/farm-pattern.png')] opacity-10"></div>
                    <div className="container-custom relative z-10 text-center text-white">
                        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
                            Cultivating the Future
                        </h1>
                        <p className="text-xl md:text-2xl max-w-3xl mx-auto text-green-50 font-light leading-relaxed">
                            Mel-Agro is your trusted partner in modern agriculture, delivering quality inputs and expertise directly to your farm.
                        </p>
                    </div>
                </section>

                {/* Subsidiary Badge Section */}
                <section className="bg-white -mt-10 relative z-20">
                    <div className="container-custom">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-4xl mx-auto text-center transform hover:-translate-y-1 transition-transform duration-300">
                            <p className="text-sm font-bold text-melagro-primary uppercase tracking-widest mb-3">Our Heritage</p>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                                A Proud Subsidiary of <span className="text-green-700">Makamithi</span>
                            </h2>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                Mel-Agro operates under the umbrella of <strong>Makamithi</strong>, a renowned leader in agricultural solutions. We leverage Makamithi's decades of expertise, research, and supply chain excellence to bring you a seamless digital shopping experience. When you shop with Mel-Agro, you are backed by the reliability and quality assurance that the Makamithi brand is known for.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Mission & Vision Grid */}
                <section className="py-20 bg-gray-50">
                    <div className="container-custom">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                            {/* Mission */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
                                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-melagro-primary group-hover:text-white transition-colors duration-300 text-melagro-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    To empower farmers by providing easy access to high-quality agricultural inputs, expert advisory services, and sustainable solutions that maximize productivity and profitability.
                                </p>
                            </div>

                            {/* Vision */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 text-blue-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    To be Africa's leading digital agribusiness partner, recognized for innovation, reliability, and our significant contribution to a food-secure continent.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Why Choose Us */}
                <section className="py-20 bg-white">
                    <div className="container-custom">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose Mel-Agro?</h2>
                            <p className="text-gray-500 max-w-2xl mx-auto">We combine technology with agronomy to serve you better.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    title: "Quality Guaranteed",
                                    desc: "We source directly from manufacturers to ensure 100% authentic products.",
                                    icon: (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )
                                },
                                {
                                    title: "Expert Support",
                                    desc: "Access to professional agronomists for advice on crop protection and nutrition.",
                                    icon: (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    )
                                },
                                {
                                    title: "Fast Delivery",
                                    desc: "Reliable logistics network ensuring your inputs reach you on time, every time.",
                                    icon: (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    )
                                }
                            ].map((feature, idx) => (
                                <div key={idx} className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors duration-300">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-700">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                    <p className="text-gray-600">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section className="py-20 bg-melagro-primary text-white text-center">
                    <div className="container-custom">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Boost Your Yield?</h2>
                        <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
                            Explore our wide range of seeds, fertilizers, and agrochemicals today.
                        </p>
                        <Link href="/products" className="inline-block bg-white text-melagro-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-50 transition-colors shadow-lg">
                            Shop Now
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
