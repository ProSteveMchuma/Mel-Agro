import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function ContactPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-16 text-center lg:text-left">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Contact Makamithi</h1>
                        <p className="text-lg text-gray-600">We are here to help you grow. Reach out with your orders, farming advice, or partnerships.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                        {/* Contact Form */}
                        <div className="bg-white rounded-2xl p-8 border border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900 mb-8">Send us a message</h2>

                            <form className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Phone Number (Optional)</label>
                                    <input
                                        type="tel"
                                        placeholder="+254 712 345 678"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Subject</label>
                                    <select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50">
                                        <option>General Inquiry</option>
                                        <option>Order Issue</option>
                                        <option>Farming Advice</option>
                                        <option>Partnership</option>
                                        <option>Feedback</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Message</label>
                                    <textarea
                                        rows={5}
                                        placeholder="How can we help you today?"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50 resize-none"
                                    />
                                </div>

                                <button type="submit" className="w-full bg-melagro-primary hover:bg-melagro-secondary text-white font-bold py-3 px-6 rounded-lg transition-colors">
                                    Send Message
                                </button>
                            </form>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-6">
                            {/* Info Card */}
                            <div className="bg-white rounded-2xl p-8 border border-gray-200 h-full">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>

                                <div className="space-y-6">
                                    {/* Phone */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-melagro-primary/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg">📞</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-500 uppercase">Phone Support</p>
                                            <p className="text-lg font-bold text-gray-900">+254 700 123 456</p>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-melagro-primary/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg">✉️</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-500 uppercase">Email</p>
                                            <p className="text-lg font-bold text-gray-900">support@melagro.com</p>
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-melagro-primary/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg">📍</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-500 uppercase">Address</p>
                                            <p className="text-gray-900 font-semibold">Makamithi Towers, 4th Floor</p>
                                            <p className="text-gray-900 font-semibold">Ngong Road, Nairobi, Kenya</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-gray-100">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Opening Hours</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Monday - Friday</span>
                                            <span className="font-bold text-gray-900">8:00 AM - 5:00 PM</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Saturday</span>
                                            <span className="font-bold text-gray-900">8:00 AM - 1:00 PM</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Sunday</span>
                                            <span className="font-bold text-gray-900">Closed</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <Link href="https://wa.me/254700123456" target="_blank" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <span>💬</span> Chat on WhatsApp
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div className="bg-white rounded-2xl p-12 border border-gray-200">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
                            <p className="text-gray-600">Find quick answers to common questions</p>
                            <Link href="/help" className="text-melagro-primary hover:underline font-semibold text-sm mt-2 inline-block">
                                Visit FAQ Center →
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {[
                                {
                                    question: "What are your delivery options?",
                                    answer: "We offer Standard Delivery (1-3 business days) and Pick-up Station options for all orders."
                                },
                                {
                                    question: "How do I track my order?",
                                    answer: "You can track your order in real-time from your account dashboard after placing it."
                                },
                                {
                                    question: "What payment methods do you accept?",
                                    answer: "We accept M-Pesa, Card payments, and Bank transfers. All transactions are secure."
                                },
                                {
                                    question: "Can I return items?",
                                    answer: "Yes! We have a 14-day return policy for unopened items. Contact support for returns."
                                }
                            ].map((faq, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                    <h4 className="font-bold text-gray-900 mb-2">{faq.question}</h4>
                                    <p className="text-gray-600 text-sm">{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Support Section */}
                    <div className="mt-16 bg-gradient-to-r from-melagro-primary to-melagro-secondary rounded-2xl p-12 text-white text-center">
                        <h2 className="text-3xl font-bold mb-4">Still need help?</h2>
                        <p className="text-lg mb-8 opacity-90">Our agricultural experts and support team are available Monday - Sunday, 8am - 8pm</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="https://wa.me/254700123456" target="_blank" className="bg-white text-melagro-primary px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors">
                                💬 WhatsApp
                            </Link>
                            <Link href="tel:+254700123456" className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors">
                                📞 Call Us
                            </Link>
                            <Link href="mailto:support@melagro.com" className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors">
                                📧 Email
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

