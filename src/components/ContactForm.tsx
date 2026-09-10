"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

const SUBJECTS = ['General Inquiry', 'Order Issue', 'Partnership', 'Feedback'] as const;

export default function ContactForm() {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        subject: SUBJECTS[0],
        message: '',
    });

    const update = (field: keyof typeof form) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => setForm((current) => ({ ...current, [field]: event.target.value }));

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.name.trim() || !form.message.trim()) {
            toast.error('Name and message are required');
            return;
        }
        if (!form.email.trim() && !form.phone.trim()) {
            toast.error('Add an email or phone number so we can reply');
            return;
        }
        setSubmitting(true);
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                setSubmitted(true);
            } else {
                toast.error(data.message || 'Could not send your message');
            }
        } catch {
            toast.error('Could not send your message. Try WhatsApp or call us.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8 text-center">
                <div className="mb-3 text-4xl">✅</div>
                <h3 className="text-xl font-black text-green-900">Message received</h3>
                <p className="mt-2 text-sm text-green-800">We will reply by phone, SMS, or WhatsApp during support hours.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="contact-name" className="block text-sm font-bold text-gray-900 mb-2">Full Name</label>
                    <input
                        id="contact-name"
                        type="text"
                        required
                        value={form.name}
                        onChange={update('name')}
                        placeholder="Enter your name"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagri-primary/50"
                    />
                </div>
                <div>
                    <label htmlFor="contact-email" className="block text-sm font-bold text-gray-900 mb-2">Email Address</label>
                    <input
                        id="contact-email"
                        type="email"
                        value={form.email}
                        onChange={update('email')}
                        placeholder="Enter your email"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagri-primary/50"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="contact-phone" className="block text-sm font-bold text-gray-900 mb-2">Phone Number</label>
                <input
                    id="contact-phone"
                    type="tel"
                    value={form.phone}
                    onChange={update('phone')}
                    placeholder="+254 712 345 678"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagri-primary/50"
                />
                <p className="mt-1 text-xs text-gray-500">Email or phone is required so we can reply.</p>
            </div>

            <div>
                <label htmlFor="contact-subject" className="block text-sm font-bold text-gray-900 mb-2">Subject</label>
                <select
                    id="contact-subject"
                    value={form.subject}
                    onChange={update('subject')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagri-primary/50"
                >
                    {SUBJECTS.map((subject) => (
                        <option key={subject}>{subject}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="contact-message" className="block text-sm font-bold text-gray-900 mb-2">Message</label>
                <textarea
                    id="contact-message"
                    rows={5}
                    required
                    minLength={10}
                    value={form.message}
                    onChange={update('message')}
                    placeholder="How can we help you today?"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagri-primary/50 resize-none"
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full bg-melagri-primary hover:bg-melagri-secondary text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-60"
            >
                {submitting ? 'Sending...' : 'Send Message'}
            </button>
        </form>
    );
}
