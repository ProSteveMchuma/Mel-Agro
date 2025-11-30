import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ServicesPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow py-16 bg-gray-50">
                <div className="container-custom">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl font-extrabold text-makamithi-dark mb-4">Our Services</h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Comprehensive agricultural solutions tailored to meet the needs of every farmer.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Service 1 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
                            <div className="bg-makamithi-light/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-makamithi-green group-hover:bg-makamithi-green group-hover:text-white transition-colors">
                                <span className="text-4xl">🌱</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">Crop Advisory</h3>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                Our team of agronomists provides expert advice on crop selection, planting techniques, and disease management to ensure you get the best harvest.
                            </p>
                            <ul className="space-y-2 text-gray-500">
                                <li className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-makamithi-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span>Site selection</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-makamithi-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span>Pest & disease control</span>
                                </li>
                            </ul>
                        </div>

                        {/* Service 2 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
                            <div className="bg-makamithi-light/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-makamithi-green group-hover:bg-makamithi-green group-hover:text-white transition-colors">
                                <span className="text-4xl">🧪</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">Soil Testing</h3>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                We offer comprehensive soil analysis to determine nutrient levels and pH, helping you apply the right fertilizers for maximum yield.
                            </p>
                            <ul className="space-y-2 text-gray-500">
                                <li className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-makamithi-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span>pH analysis</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-makamithi-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span>Nutrient profiling</span>
                                </li>
                            </ul>
                        </div>

                        {/* Service 3 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
                            <div className="bg-makamithi-light/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-makamithi-green group-hover:bg-makamithi-green group-hover:text-white transition-colors">
                                <span className="text-4xl">🚚</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">Delivery</h3>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                Get your farm inputs delivered directly to your doorstep. We ensure timely and safe delivery of all products to any location.
                            </p>
                            <ul className="space-y-2 text-gray-500">
                                <li className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-makamithi-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span>Nationwide coverage</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-makamithi-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span>Timely dispatch</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
