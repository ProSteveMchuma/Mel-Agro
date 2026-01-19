import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 font-sans">
            <div className="container-custom">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Info */}
                    <div>
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-gradient-to-br from-melagro-primary to-melagro-secondary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                                M
                            </div>
                            <div>
                                <span className="text-lg font-bold text-white block">MelAgro</span>
                                <span className="text-xs text-gray-400">Agro Hub</span>
                            </div>
                        </Link>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            Your trusted partner for premium agricultural inputs, expert knowledge, and sustainable farming solutions across Kenya.
                        </p>
                        <div className="flex gap-3 mb-6">
                            {/* WhatsApp */}
                            <a href="https://wa.me/254748970757" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-green-600 flex items-center justify-center text-gray-300 hover:text-white transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                                </svg>
                            </a>
                            {/* Facebook */}
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center text-gray-300 hover:text-white transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-white mb-6 text-sm uppercase tracking-wider">Quick Links</h4>
                        <ul className="space-y-3">
                            <li><Link href="/products" className="text-gray-400 hover:text-melagro-accent transition-colors">Shop Products</Link></li>
                            <li><Link href="/about" className="text-gray-400 hover:text-melagro-accent transition-colors">About Us</Link></li>
                            <li><Link href="/contact" className="text-gray-400 hover:text-melagro-accent transition-colors">Contact & Support</Link></li>
                            <li><Link href="/services" className="text-gray-400 hover:text-melagro-accent transition-colors">Our Services</Link></li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div>
                        <h4 className="font-bold text-white mb-6 text-sm uppercase tracking-wider">Shop by Category</h4>
                        <ul className="space-y-3">
                            <li><Link href="/products?category=Seeds" className="text-gray-400 hover:text-melagro-accent transition-colors">Seeds & Seedlings</Link></li>
                            <li><Link href="/products?category=Fertilizers" className="text-gray-400 hover:text-melagro-accent transition-colors">Fertilizers</Link></li>
                            <li><Link href="/products?category=Tools" className="text-gray-400 hover:text-melagro-accent transition-colors">Farm Tools</Link></li>
                            <li><Link href="/products?category=Feeds" className="text-gray-400 hover:text-melagro-accent transition-colors">Animal Feeds</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold text-white mb-6 text-sm uppercase tracking-wider">Get in Touch</h4>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-melagro-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <span className="text-gray-400">support@melagro.com</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-melagro-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                <span className="text-gray-400">+254 700 000 000</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-800 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                        <p>© 2025 MelAgro. All rights reserved.</p>
                        <div className="flex gap-6">
                            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
