"use client";

import { useState } from 'react';

export default function NewsletterSignup({ compact = false }: { compact?: boolean }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setStatus('submitting');
        setMessage('');

        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: compact ? 'footer' : 'homepage' }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not subscribe.');
            setStatus('success');
            setMessage("You're subscribed. Watch your inbox for Mel-Agri updates.");
            setEmail('');
        } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Could not subscribe. Please try again.');
        }
    };

    if (status === 'success') {
        return <p role="status" className={compact ? 'text-sm text-green-300' : 'text-green-300 font-semibold'}>{message}</p>;
    }

    const messageId = compact ? 'footer-newsletter-message' : 'newsletter-message';
    const inputId = compact ? 'footer-newsletter-email' : 'newsletter-email';

    return (
        <form onSubmit={handleSubmit} className={compact ? 'space-y-2' : 'flex flex-col sm:flex-row gap-4 max-w-lg mx-auto'}>
            <label htmlFor={inputId} className="sr-only">Email address</label>
            <div className={compact ? 'flex' : 'contents'}>
                <input
                    id={inputId}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                    disabled={status === 'submitting'}
                    aria-describedby={message ? messageId : undefined}
                    className={compact
                        ? 'min-w-0 flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
                        : 'flex-grow px-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white/10 transition-all font-medium'}
                />
                <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className={compact
                        ? 'min-h-11 bg-[#22c55e] hover:bg-green-600 text-white font-bold px-4 py-2 rounded-r-lg text-xs uppercase tracking-wider disabled:opacity-60'
                        : 'min-h-11 bg-[#22c55e] text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-60'}
                >
                    {status === 'submitting' ? 'Joining…' : compact ? 'Join' : 'Join Now'}
                </button>
            </div>
            {message && <p id={messageId} role="alert" className="text-sm text-red-300">{message}</p>}
        </form>
    );
}
