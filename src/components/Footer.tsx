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
                        <div className="flex gap-4 pt-2">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 2.404-4.69 3.83-7.541 3.83-.49 0-.97-.03-1.44-.094 2.69 1.724 5.891 2.73 9.324 2.73 11.175 0 17.288-9.14 17.288-17.07 0-.256-.006-.514-.017-.768 1.187-.847 2.216-1.921 3.033-3.07z" /></svg></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg></a>
                        </div>
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
                            <span className="bg-white px-2 py-1 rounded text-[10px] font-bold text-gray-800">VISA</span>
                            <span className="bg-white px-2 py-1 rounded text-[10px] font-bold text-gray-800">MasterCard</span>
                        </div>

                        <h3 className="text-white font-bold uppercase tracking-wider text-xs mb-4">Newsletter</h3>
                        <div className="flex">
                            <input type="email" placeholder="Enter email" className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-l-lg text-sm w-full focus:outline-none focus:border-green-500" />
                            <button className="bg-[#22c55e] hover:bg-green-600 text-white font-bold px-4 py-2 rounded-r-lg text-xs uppercase tracking-wider transition-colors">
                                Join
                            </button>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-gray-800 pt-8 text-center">
                    <p className="text-xs text-gray-500">© 2025 Mel-Agri. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
