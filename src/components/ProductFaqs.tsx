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
    const category = product.category || "agricultural input";
    const brand = product.brand || "authorized manufacturers";

    const faqsList = [
        {
            question: `Is the ${name} sold at Mel-Agro original and certified?`,
            answer: `Yes, absolutely. Mel-Agro is an authorized dealer of certified agricultural inputs in Kenya. Every package of ${name} is sourced directly from ${brand} and verified for authenticity, quality, and expiration dates. We do not sell counterfeit or uncertified products.`
        },
        {
            question: `What is the price of ${name} in Kenya?`,
            answer: `The current price of ${name} is KES ${price} at Mel-Agro. We strive to offer the most competitive market rates for genuine inputs, ensuring farmers get original quality at fair prices.`
        },
        {
            question: `How does Mel-Agro deliver ${name} to Nakuru, Eldoret, and other counties?`,
            answer: `We offer fast nationwide delivery across all 47 counties in Kenya, including Nakuru, Eldoret, Kisumu, Mombasa, Nyeri, and Meru. Orders above KES 10,000 qualify for free delivery. For orders under KES 10,000, we charge a flat delivery fee of KES 300. Orders are dispatched within 24 hours and delivered within 1 to 3 business days.`
        }
    ];

    // Category-specific high-value questions for AI search answering
    const catLower = category.toLowerCase();
    if (catLower.includes('seed') || catLower.includes('seedling')) {
        faqsList.push({
            question: `What is the best spacing and planting depth for ${name}?`,
            answer: `For planting ${name}, follow certified seeds standards: generally space row-to-row at 75cm and plant-to-plant at 25cm, placing the seed about 2-5cm deep. Ensure the soil has sufficient moisture at planting and apply basal fertilizer (like NPK or DAP) to stimulate early root development.`
        });
    } else if (catLower.includes('fertilizer') || catLower.includes('npk') || catLower.includes('dap') || catLower.includes('urea') || catLower.includes('can')) {
        faqsList.push({
            question: `How and when should I apply ${name} to maximize crop yield?`,
            answer: `Apply ${name} based on crop growth stages. Basal fertilizers (such as DAP or NPK) should be applied at planting and mixed well with soil to prevent seed burning. Top-dressing fertilizers (like CAN or Urea) should be applied during vegetative growth or split-applied before flowering. Ensure soil is moist to facilitate nutrient absorption.`
        });
    } else if (catLower.includes('pesticide') || catLower.includes('fungicide') || catLower.includes('insecticide') || catLower.includes('herbicide') || catLower.includes('spray') || catLower.includes('chemical')) {
        faqsList.push({
            question: `What is the dilution rate and safety protocol for spraying ${name}?`,
            answer: `Refer to the container label for precise dosage. Typically, agrochemical sprays range from 20ml to 50ml per 20 Liters of water (one knapsack sprayer). Always spray early in the morning or late in the evening to avoid evaporation and drift. Wear full personal protective equipment (PPE) including overalls, masks, and gloves.`
        });
    } else {
        faqsList.push({
            question: `What crops or livestock is ${name} recommended for?`,
            answer: `This product is recommended for general agricultural and farming use. For specific crop schedules, feed formulations, or dosage guidelines, please contact Mel-Agro's agronomy support team via WhatsApp or call our support lines.`
        });
    }

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
