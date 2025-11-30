export default function BrandLogos() {
    const brands = [
        "Syngenta", "Bayer", "Yara", "Corteva", "Osho", "Twiga Chemicals"
    ];

    return (
        <section className="py-12 bg-gray-50 border-b border-gray-100">
            <div className="container-custom">
                <p className="text-center text-gray-400 text-sm font-medium uppercase tracking-widest mb-8">Trusted by Farmers & Partners</p>
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                    {brands.map((brand, index) => (
                        <span key={index} className="text-xl md:text-2xl font-bold text-gray-400 hover:text-makamithi-dark cursor-default select-none transition-colors">
                            {brand}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
