import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
    return (
        <footer className="bg-[#1f2937] text-gray-300 py-16 font-sans">
            <div className="container-custom">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Column 1: Brand */}
                    <div className="space-y-6">
                        <Link href="/">
                            <Logo light iconOnly />
                            <span className="text-xl font-black text-white tracking-widest ml-2">Mel-Agri</span>
                        </Link>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Bringing Quality Agricultural Inputs Online in Kenya. Trusted by Farmers for better Harvests.
                        </p>
                        <a href="https://wa.me/254748970757" target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-bold text-green-400 hover:text-green-300 transition-colors">
                            WhatsApp support: +254 748 970 757
                        </a>
                    </div>

                    {/* Column 2: About Mel-Agri */}
                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider text-xs mb-6">About Mel-Agri</h3>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms and Conditions</Link></li>
                            <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/billing" className="text-gray-400 hover:text-white transition-colors">Billing Policy</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Buying on Mel-Agri */}
                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider text-xs mb-6">Buying on Mel-Agri</h3>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/delivery" className="text-gray-400 hover:text-white transition-colors">Delivery</Link></li>
                            <li><Link href="/returns" className="text-gray-400 hover:text-white transition-colors">Return Policy</Link></li>
                            <li><Link href="/bulk" className="text-gray-400 hover:text-white transition-colors">Bulk Orders</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Payment & Newsletter */}
                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider text-xs mb-6">Payment Methods</h3>
                        <div className="flex gap-2 mb-8">
                            <span className="bg-white px-2 py-1 rounded text-[10px] font-bold text-gray-800">M-PESA</span>
                        </div>

                        <h3 className="text-white font-bold uppercase tracking-wider text-xs mb-4">Need Help?</h3>
                        <p className="text-sm text-gray-400 mb-3">Ask about products, delivery, or an existing order.</p>
                        <Link href="/contact" className="inline-flex bg-[#22c55e] hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors">
                            Contact Support
                        </Link>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-gray-800 pt-8 text-center">
                    <p className="text-xs text-gray-500">© {new Date().getFullYear()} Mel-Agri. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
