"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Newsletter() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("submitting");
        // Simulate API call
        setTimeout(() => {
            setStatus("success");
            setEmail("");
        }, 1500);
    };

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

                    <AnimatePresence mode="wait">
                        {status === "success" ? (
                            <motion.div
                                key="success"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2rem] inline-block"
                            >
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 scale-110">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-xl font-black text-white mb-2">You're on the list!</h3>
                                <p className="text-gray-400 text-sm">Welcome to the future of African farming.</p>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleSubmit}
                                className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto"
                            >
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="flex-grow px-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white/10 transition-all font-medium"
                                    required
                                    disabled={status === "submitting"}
                                />
                                <button
                                    type="submit"
                                    disabled={status === "submitting"}
                                    className="group relative bg-[#22c55e] text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest overflow-hidden transition-all disabled:opacity-50"
                                >
                                    <span className="relative z-10">
                                        {status === "submitting" ? "Processing..." : "Join Now"}
                                    </span>
                                    <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-20"></div>
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-8">NO SPAM • SECURE • CANCEL ANYTIME</p>
                </div>
            </div>
        </section>
    );
}
