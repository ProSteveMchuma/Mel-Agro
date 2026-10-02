"use client";
import React, { useState } from 'react';
import { Product } from '@/lib/products';

interface ProductFaqsProps {
    product: Product;
}

export default function ProductFaqs({ product }: ProductFaqsProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    // Generate dynamic FAQs based on product attributes
    const name = product.name;
    const price = product.price.toLocaleString();
    const brand = product.brand || "authorized manufacturers";

    const faqsList = [
        {
            question: `Is the ${name} sold at Mel-Agri original and certified?`,
            answer: `Yes, absolutely. Mel-Agri is an authorized dealer of certified agricultural inputs in Kenya. Every package of ${name} is sourced directly from ${brand} and verified for authenticity, quality, and expiration dates. We do not sell counterfeit or uncertified products.`
        },
        {
            question: `What is the price of ${name} in Kenya?`,
            answer: `The current price of ${name} is KES ${price} at Mel-Agri. We strive to offer the most competitive market rates for genuine inputs, ensuring farmers get original quality at fair prices.`
        },
        {
            question: `How does Mel-Agri deliver ${name} to Nakuru, Eldoret, and other counties?`,
            answer: `Mel-Agri delivers across Kenya from Machakos. Orders of KES 10,000 or more get free delivery. Below that, the fee depends on your county (about KES 200 in the Nairobi and Machakos zone, up to KES 750 elsewhere). You see the exact amount at checkout. Machakos pickup is free.`
        }
    ];

    faqsList.push({
        question: `How should I use ${name}?`,
        answer: `Follow the directions on the registered pack label for ${name}. This page does not give a dosage, dilution, or spacing rate. Ask a qualified agronomist or veterinarian when the label does not cover your crop, animal, or county.`
    });

    // Build the schema markup
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqsList.map(item => ({
            '@type': 'Question',
            'name': item.question,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': item.answer
            }
        }))
    };

    return (
        <div className="mt-16 bg-white border border-gray-100 rounded-[2rem] p-6 md:p-10 shadow-xl shadow-gray-100/50">
            {/* Inject JSON-LD Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <div className="mb-8">
                <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em] mb-1">Knowledge Base</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase">
                    Frequently Asked Questions
                </h3>
            </div>

            <div className="space-y-4">
                {faqsList.map((faq, index) => {
                    const isOpen = openIndex === index;
                    return (
                        <div
                            key={index}
                            className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                        >
                            <button
                                onClick={() => toggleAccordion(index)}
                                className="w-full flex items-center justify-between py-4 text-left font-bold text-gray-900 hover:text-green-600 transition-colors focus:outline-none group"
                            >
                                <span className="text-sm md:text-base pr-4">{faq.question}</span>
                                <span className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-all ${isOpen ? 'rotate-180 bg-green-50 text-green-600' : ''}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
                            >
                                <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-medium pl-1 pr-6">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
