"use client";

import React from 'react';
import Image from 'next/image';

export default function Partners() {
    return (
        <section className="py-16 bg-gray-50 relative overflow-hidden rounded-[3rem] mx-4 md:mx-8 my-8 border border-gray-100 shadow-sm">
            <div className="container-custom mb-10 flex flex-col items-center relative z-10 text-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">Our Partners</h2>
                <p className="text-gray-500 font-medium">Trusted brands we work with</p>
            </div>
            
            <div className="partners-track">
                <div className="partners-slide">
                    <a href="https://www.bayer.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/bayer.png" alt="Bayer" width={200} height={100} />
                    </a>
                    <a href="https://www.syngenta.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/syngenta.png" alt="Syngenta" width={200} height={100} />
                    </a>
                    <a href="https://www.corteva.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/corteva.png" alt="Corteva" width={200} height={100} />
                    </a>
                    <a href="https://www.seedcogroup.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/seedco.png" alt="SeedCo" width={200} height={100} />
                    </a>
                    <a href="https://unga-group.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/unga.png" alt="Unga PLC" width={200} height={100} />
                    </a>
                    <a href="https://oshochem.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/osho.png" alt="Osho" width={200} height={100} />
                    </a>
                    <a href="https://www.bayer.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/bayer.png" alt="Bayer" width={200} height={100} />
                    </a>
                    <a href="https://www.syngenta.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/syngenta.png" alt="Syngenta" width={200} height={100} />
                    </a>
                </div>
                <div className="partners-slide" aria-hidden="true">
                    <a href="https://www.bayer.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/bayer.png" alt="Bayer" width={200} height={100} />
                    </a>
                    <a href="https://www.syngenta.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/syngenta.png" alt="Syngenta" width={200} height={100} />
                    </a>
                    <a href="https://www.corteva.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/corteva.png" alt="Corteva" width={200} height={100} />
                    </a>
                    <a href="https://www.seedcogroup.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/seedco.png" alt="SeedCo" width={200} height={100} />
                    </a>
                    <a href="https://unga-group.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/unga.png" alt="Unga PLC" width={200} height={100} />
                    </a>
                    <a href="https://oshochem.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/osho.png" alt="Osho" width={200} height={100} />
                    </a>
                    <a href="https://www.bayer.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/bayer.png" alt="Bayer" width={200} height={100} />
                    </a>
                    <a href="https://www.syngenta.com" target="_blank" rel="noopener noreferrer" className="partner-logo">
                        <Image src="/assets/partners/syngenta.png" alt="Syngenta" width={200} height={100} />
                    </a>
                </div>
            </div>
        </section>
    );
}

