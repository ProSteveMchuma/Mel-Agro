import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200">
            <div className="container-custom">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Info */}
                    <div>
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-melagro-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                                M
                            </div>
                            <span className="text-xl font-bold text-melagro-primary tracking-tight">
                                MelAgro
                            </span>
                        </Link>
                        <p className="text-gray-500 leading-relaxed mb-6">
                            Empowering farmers with premium agricultural inputs and expert knowledge for sustainable growth and better yields.
                        </p>
                        <div className="flex gap-4">
                            {/* Social Icons Placeholder */}
                            {[1, 2, 3, 4].map((i) => (
                                <a key={i} href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-melagro-primary hover:text-white hover:border-melagro-primary transition-all">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-6">Quick Links</h4>
                        <ul className="space-y-3">
                            <li><Link href="/products" className="text-gray-500 hover:text-melagro-primary transition-colors">All Products</Link></li>
                            <li><Link href="/about" className="text-gray-500 hover:text-melagro-primary transition-colors">About Us</Link></li>
                            <li><Link href="/contact" className="text-gray-500 hover:text-melagro-primary transition-colors">Contact Support</Link></li>
                            <li><Link href="/blog" className="text-gray-500 hover:text-melagro-primary transition-colors">Farming Tips</Link></li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-6">Categories</h4>
                        <ul className="space-y-3">
                            <li><Link href="/category/seeds" className="text-gray-500 hover:text-melagro-primary transition-colors">Seeds & Seedlings</Link></li>
                            <li><Link href="/category/fertilizers" className="text-gray-500 hover:text-melagro-primary transition-colors">Fertilizers</Link></li>
                            <li><Link href="/category/pesticides" className="text-gray-500 hover:text-melagro-primary transition-colors">Pesticides</Link></li>
                            <li><Link href="/category/equipment" className="text-gray-500 hover:text-melagro-primary transition-colors">Farm Equipment</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-6">Contact Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-melagro-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-gray-500">123 Agri Lane, Nairobi, Kenya</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-melagro-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-gray-500">+254 700 000 000</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-melagro-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-gray-500">info@melagro.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} MelAgro. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-gray-400">
                        <Link href="/privacy" className="hover:text-melagro-primary transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-melagro-primary transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
