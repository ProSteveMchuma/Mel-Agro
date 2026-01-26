"use client";

import { useState } from "react";

const FAQS = [
    {
        question: "Do you offer delivery services?",
        answer: "Yes, we offer reliable delivery services across the country. Delivery fees vary based on your location and the size of your order."
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept M-Pesa, Credit/Debit Cards, and Bank Transfers. All payments are secure and encrypted."
    },
    {
        question: "Can I return products if I'm not satisfied?",
        answer: "We have a 7-day return policy for unopened and unused products. Please contact our support team for assistance with returns."
    },
    {
        question: "Do you provide technical advice for farmers?",
        answer: "Absolutely! Our team of agronomists is available to provide expert advice on crop protection, fertilizer application, and seed selection."
    },
    {
        question: "How can I track my order?",
        answer: "Once your order is shipped, you will receive a tracking number via SMS and Email. You can also track your order status in your account dashboard."
    }
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-24 bg-gray-50">
            <div className="container-custom max-w-4xl">
                <div className="text-center mb-16">
                    <span className="text-melagri-primary font-bold tracking-wider uppercase text-sm">Common Questions</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-4">
                    {FAQS.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                            >
                                <span className={`font-bold text-lg ${openIndex === index ? 'text-melagri-primary' : 'text-gray-900'}`}>
                                    {faq.question}
                                </span>
                                <span className={`transform transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>

                            <div
                                className={`transition-all duration-300 ease-in-out overflow-hidden ${openIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="p-6 pt-0 text-gray-600 leading-relaxed">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
