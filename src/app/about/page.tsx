import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Our Heritage & Vision",
    description: "Bringing Quality Agricultural Inputs Online in Kenya. Learn about Mel-Agri's mission to transform Kenyan agriculture and our legacy of excellence.",
};

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Header />

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative py-32 lg:py-48 bg-gray-900 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-melagri-primary/40 via-transparent to-melagri-secondary/20 z-0"></div>
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-melagri-primary/20 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-melagri-secondary/10 rounded-full blur-[80px] -ml-24 -mb-24"></div>

                    <div className="container-custom relative z-10">
                        <div className="max-w-4xl">
                            <span className="inline-block px-4 py-2 bg-melagri-primary/10 border border-melagri-primary/20 rounded-full text-melagri-primary text-xs font-black tracking-widest uppercase mb-6 animate-fade-in">
                                Established for Excellence
                            </span>
                            <h1 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
                                Cultivating the <span className="text-transparent bg-clip-text bg-gradient-to-r from-melagri-primary to-green-300">Future</span> of Agri-Tech
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-400 font-medium leading-relaxed max-w-2xl">
                                Mel-Agri is redefining the agricultural landscape in Africa through innovation and quality inputs.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Heritage Section (The Mel-Agri Legacy) */}
                <section className="relative z-20 -mt-16">
                    <div className="container-custom">
                        <div className="bg-white/80 backdrop-blur-2xl rounded-[40px] shadow-2xl shadow-black/5 border border-white p-8 md:p-16 lg:p-20">
                            <div className="flex flex-col lg:flex-row gap-12 items-center">
                                <div className="lg:w-1/2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full text-green-700 text-[10px] font-bold uppercase tracking-wider mb-6">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                        Our Heritage
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 tracking-tight">
                                        A Proud Subsidiary of <span className="text-melagri-primary">Mel-Agri</span>
                                    </h2>
                                    <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
                                        <p>
                                            Mel-Agri operates as a specialized digital arm of <strong>Mel-Agri</strong>, leveraging decades of on-field expertise and supply chain mastery.
                                        </p>
                                        <p>
                                            Our ecosystem is built on the foundation of research and development, ensuring that every product on our platform meets the highest standards of agricultural efficacy.
                                        </p>
                                    </div>
                                    <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-8">
                                        <div>
                                            <div className="text-3xl font-black text-melagri-primary">20+</div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Years Experience</div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-black text-melagri-primary">50k+</div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Farmers Served</div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-black text-melagri-primary">100%</div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quality Assurance</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:w-1/2 relative">
                                    <div className="aspect-square bg-gradient-to-br from-melagri-primary to-green-200 rounded-[3rem] overflow-hidden shadow-2xl transform lg:rotate-3 hover:rotate-0 transition-transform duration-700">
                                        <div className="absolute inset-0 bg-black/10"></div>
                                        <div className="p-12 h-full flex flex-col justify-end text-white">
                                            <div className="text-6xl font-black mb-4">"</div>
                                            <p className="text-2xl font-bold leading-tight italic">
                                                Leading the digital revolution in African agriculture, one farm at a time.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission & Vision */}
                <section className="py-32 bg-gray-50/50">
                    <div className="container-custom">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="group relative p-10 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-500">
                                <div className="absolute -top-6 -right-6 w-32 h-32 bg-melagri-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-20 h-20 bg-melagri-primary/10 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform text-melagri-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-6">Our Mission</h3>
                                <p className="text-lg text-gray-500 leading-relaxed font-medium">
                                    To empower farmers by providing frictionless access to high-quality agricultural inputs and sustainable solutions that maximize productivity and legacy.
                                </p>
                            </div>

                            <div className="group relative p-10 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-500">
                                <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform text-blue-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-6">Our Vision</h3>
                                <p className="text-lg text-gray-500 leading-relaxed font-medium">
                                    To be Africa's definitive digital agribusiness partner, setting the benchmark for innovation, transparency, and impact across the entire value chain.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Core Values */}
                <section className="py-32 bg-white">
                    <div className="container-custom">
                        <div className="text-center mb-20">
                            <span className="text-xs font-black text-white uppercase tracking-[0.2em] mb-4 block">The Mel-Agri DNA</span>
                            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter">Our Core Values</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { title: "Integrity", desc: "Honesty in every seed we sell and every advice we give.", color: "bg-green-500" },
                                { title: "Innovation", desc: "Constant pursuit of digital solutions for simple problems.", color: "bg-melagri-primary" },
                                { title: "Resilience", desc: "Standing by our farmers through every season and storm.", color: "bg-orange-500" },
                                { title: "Excellence", desc: "Uncompromising quality in products and customer service.", color: "bg-blue-600" }
                            ].map((val, i) => (
                                <div key={i} className="p-8 rounded-[2rem] bg-gray-50 border border-gray-100 hover:bg-white hover:border-melagri-primary/20 hover:shadow-2xl transition-all group">
                                    <div className={`w-3 h-3 rounded-full mb-6 ${val.color}`}></div>
                                    <h4 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{val.title}</h4>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{val.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section className="py-24 bg-gray-900 relative overflow-hidden text-center">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="container-custom relative z-10">
                        <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter">Ready to Scale?</h2>
                        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-medium">
                            Step into the future of farming with premium inputs and expert guidance from the pros.
                        </p>
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-3 bg-melagri-primary text-white px-12 py-5 rounded-2xl font-black text-lg hover:bg-melagri-secondary transition-all shadow-2xl shadow-melagri-primary/40 active:scale-95"
                        >
                            Explore Marketplace
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
