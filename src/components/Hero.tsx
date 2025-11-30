import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative bg-gray-900 overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40 z-10" />
                {/* Placeholder for actual hero image - using a solid color for now, but in a real app this would be an image */}
                <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1740&auto=format&fit=crop')] bg-cover bg-center" />
            </div>

            <div className="container-custom relative z-20 py-24 md:py-32 lg:py-40">
                <div className="max-w-2xl text-white">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-melagro-secondary/20 border border-melagro-secondary/50 text-melagro-secondary font-medium text-sm mb-6 backdrop-blur-sm">
                        🌱 Premium Agricultural Solutions
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                        Cultivating Success for <span className="text-melagro-secondary">Every Harvest</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed">
                        Discover top-quality seeds, fertilizers, and expert advice to maximize your yield.
                        MelAgro is your trusted partner in modern farming.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="/products" className="btn-primary text-center">
                            Shop Now
                        </Link>
                        <Link href="/contact" className="btn-secondary bg-transparent text-white border-white hover:bg-white hover:text-melagro-primary text-center">
                            Contact Experts
                        </Link>
                    </div>
                </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-20" />
        </section>
    );
}
