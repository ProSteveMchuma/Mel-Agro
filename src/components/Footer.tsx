import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200 font-sans">
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
                            {/* WhatsApp Link */}
                            <a href="https://wa.me/254748970757" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                </svg>
                            </a>

                        </div>

                        <div className="mt-8">
                            <h5 className="font-bold text-gray-800 mb-3 text-sm">Get our App</h5>
                            <div className="flex flex-col gap-2 max-w-[160px]">
                                <button className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition-colors shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                                        <path d="M17.6 11.4C17.6 8.5 20.3 7 20.4 7c-.1-.3-2.9-4-4.8-4-1.2 0-2.3.7-2.9.7-.7 0-1.8-.7-2.9-.7-2.3 0-4.4 1.8-4.4 5.2 0 3.7 2.4 9 4.8 9 1.1 0 2.2-.8 3-.8.8 0 1.9.8 3 .8 1.9 0 3.2-1.7 4.2-3.2-.2-.2-2.5-1.5-2.5-4.2zM14.9 2.8c1-.1 2.3-.6 2.8-1.7-.9 0-2.2.6-2.8 1.7 0 .1 0 .2.1.2-.1-.1-.1-.1-.1-.2z" />
                                    </svg>
                                    <div className="text-left leading-none">
                                        <div className="text-[10px] uppercase">Download on the</div>
                                        <div className="text-sm font-bold">App Store</div>
                                    </div>
                                </button>
                                <button className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition-colors shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                                        <path d="M3 20.5v-17c0-.9.6-1.5 1.5-1.5.3 0 .6.1.8.3L15 11l-9 9.8c-.3.2-.6.3-1 .3-.8 0-1.5-.6-1.5-1.5zm6.5-9l4.4-4.8 3.2 3.2-7.6 1.6zm7.6 1.6l-3.2 3.2-4.4-4.8 7.6 1.6zM17.5 13l2.7-1.3c.6-.3.6-.9 0-1.2l-2.7-1.3-2.4 2.5 2.4 2.5z" />
                                    </svg>
                                    <div className="text-left leading-none">
                                        <div className="text-[10px] uppercase">Get it on</div>
                                        <div className="text-sm font-bold">Google Play</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-6">Quick Links</h4>
                        <ul className="space-y-3">
                            <li><Link href="/products" className="text-gray-500 hover:text-melagro-primary transition-colors">All Products</Link></li>
                            <li><Link href="/about" className="text-gray-500 hover:text-melagro-primary transition-colors">About Us</Link></li>
                            <li><Link href="/contact" className="text-gray-500 hover:text-melagro-primary transition-colors">Contact Support</Link></li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-6">Categories</h4>
                        <ul className="space-y-3">
                            <li><Link href="/products?category=Seeds" className="text-gray-500 hover:text-melagro-primary transition-colors">Seeds & Seedlings</Link></li>
                            <li><Link href="/products?category=Fertilizers" className="text-gray-500 hover:text-melagro-primary transition-colors">Fertilizers</Link></li>
                            <li><Link href="/products?category=Crop%20Protection" className="text-gray-500 hover:text-melagro-primary transition-colors">Crop Protection</Link></li>
                            <li><Link href="/products?category=Animal%20Feeds" className="text-gray-500 hover:text-melagro-primary transition-colors">Animal Feeds</Link></li>
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
                                <span className="text-gray-500">Nairobi, Kenya</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-melagro-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-gray-500">+254 748 970757</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-melagro-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-gray-500">support@melagro.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} MelAgro. All rights reserved.
                    </p>
                </div>
            </div>
        </footer >
    );
}
