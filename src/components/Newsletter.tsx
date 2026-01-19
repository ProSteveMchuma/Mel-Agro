export default function Newsletter() {
    return (
        <section className="py-24 bg-gray-900 relative overflow-hidden text-white">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

            <div className="container-custom relative z-10">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Stay Cultivated</h2>
                    <p className="text-gray-300 mb-8 text-lg">
                        Subscribe to our newsletter for the latest farming tips, market trends, and exclusive offers.
                    </p>

                    <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            className="flex-grow px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-melagro-secondary focus:bg-white/20 transition-all"
                            required
                        />
                        <button
                            type="submit"
                            className="btn-primary bg-white text-gray-900 border-none hover:bg-melagro-secondary hover:text-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                        >
                            Subscribe
                        </button>
                    </form>
                    <p className="text-gray-400 text-xs mt-4">We respect your privacy. Unsubscribe at any time.</p>
                </div>
            </div>
        </section>
    );
}
