import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ContactPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow py-16 bg-gray-50">
                <div className="container-custom">
                    <h1 className="text-4xl font-extrabold text-center text-makamithi-dark mb-12">Get in Touch</h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                        {/* Contact Form */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">Send us a Message</h2>
                            <form className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input type="text" id="name" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-makamithi-green focus:border-transparent outline-none transition-all" placeholder="Your Name" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input type="email" id="email" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-makamithi-green focus:border-transparent outline-none transition-all" placeholder="you@example.com" />
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea id="message" rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-makamithi-green focus:border-transparent outline-none transition-all" placeholder="How can we help you?"></textarea>
                                </div>
                                <button type="submit" className="w-full btn-primary">
                                    Send Message
                                </button>
                            </form>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-8">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full">
                                <h2 className="text-2xl font-bold mb-6 text-gray-800">Contact Information</h2>
                                <div className="space-y-6">
                                    <div className="flex items-start space-x-4">
                                        <div className="bg-makamithi-green/10 p-3 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-makamithi-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Head Office</h3>
                                            <p className="text-gray-600">123 Farm Lane, Nairobi, Kenya</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-4">
                                        <div className="bg-makamithi-green/10 p-3 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-makamithi-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Phone</h3>
                                            <p className="text-gray-600">+254 700 000 000</p>
                                            <p className="text-gray-600">+254 700 000 001</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-4">
                                        <div className="bg-makamithi-green/10 p-3 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-makamithi-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Email</h3>
                                            <p className="text-gray-600">info@makamithi.co.ke</p>
                                            <p className="text-gray-600">support@makamithi.co.ke</p>
                                        </div>
                                    </div>
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
