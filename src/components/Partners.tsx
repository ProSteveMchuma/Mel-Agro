"use client";

import Image from "next/image";

const PARTNERS = [
    { name: "Partner 1", logo: "https://placehold.co/150x50?text=Partner+1" },
    { name: "Partner 2", logo: "https://placehold.co/150x50?text=Partner+2" },
    { name: "Partner 3", logo: "https://placehold.co/150x50?text=Partner+3" },
    { name: "Partner 4", logo: "https://placehold.co/150x50?text=Partner+4" },
    { name: "Partner 5", logo: "https://placehold.co/150x50?text=Partner+5" },
    { name: "Partner 6", logo: "https://placehold.co/150x50?text=Partner+6" },
];

export default function Partners() {
    return (
        <section className="py-12 bg-white border-t border-b border-gray-100 overflow-hidden">
            <div className="container-custom mb-8 text-center">
                <p className="text-sm font-bold tracking-wider text-gray-500 uppercase">Trusted by Industry Leaders</p>
            </div>

            <div className="relative flex overflow-x-hidden group">
                <div className="animate-marquee whitespace-nowrap flex items-center gap-16 px-8">
                    {/* First set of logos */}
                    {PARTNERS.map((partner, index) => (
                        <div key={`p1-${index}`} className="relative w-32 h-12 opacity-60 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0">
                            <Image
                                src={partner.logo}
                                alt={partner.name}
                                fill
                                className="object-contain"
                            />
                        </div>
                    ))}
                    {/* Duplicate set for seamless loop */}
                    {PARTNERS.map((partner, index) => (
                        <div key={`p2-${index}`} className="relative w-32 h-12 opacity-60 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0">
                            <Image
                                src={partner.logo}
                                alt={partner.name}
                                fill
                                className="object-contain"
                            />
                        </div>
                    ))}
                    {/* Triplicate set for wide screens */}
                    {PARTNERS.map((partner, index) => (
                        <div key={`p3-${index}`} className="relative w-32 h-12 opacity-60 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0">
                            <Image
                                src={partner.logo}
                                alt={partner.name}
                                fill
                                className="object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
