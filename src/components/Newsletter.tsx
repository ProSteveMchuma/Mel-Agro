"use client";

import { motion } from "framer-motion";
import NewsletterSignup from "./NewsletterSignup";

export default function Newsletter() {
    return (
        <section className="py-24 bg-gray-900 relative overflow-hidden text-white rounded-[3rem] mx-4 md:mx-8 mb-8">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="container-custom relative z-10">
                <div className="max-w-3xl mx-auto text-center">
                    <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter"
                    >
                        Stay Cultivated
                    </motion.h2>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 mb-10 text-lg md:text-xl font-medium"
                    >
                        Join 5,000+ farmers getting exclusive weekly deals and market insights.
                    </motion.p>

                    <NewsletterSignup />
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-8">NO SPAM • SECURE • CANCEL ANYTIME</p>
                </div>
            </div>
        </section>
    );
}
