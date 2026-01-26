"use client";
import { useState, useRef, useEffect } from 'react';
import { processMessage, BotResponse } from '@/lib/agrobot';
import Link from 'next/link';

export default function AgroBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Array<{ text: string, sender: 'user' | 'bot', type?: string, data?: any, options?: string[] }>>([
        { text: "Habari! 👋 I'm AgroBot. Ask me about seeds, fertilizers, or delivery!", sender: 'bot', type: 'text' }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (text: string = inputValue) => {
        if (!text.trim()) return;

        // User Message
        const userMsg = { text: text, sender: 'user' as const };
        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        // Bot Response
        try {
            // Simulate reading delay
            await new Promise(r => setTimeout(r, 600 + Math.random() * 500));

            const response: BotResponse = await processMessage(text);

            setMessages(prev => [...prev, {
                text: response.text,
                sender: 'bot',
                type: response.type,
                data: response.data,
                options: response.options
            }]);

        } catch (error) {
            setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting to the farm server right now.", sender: 'bot' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleOptionClick = (option: string) => {
        if (option === "WhatsApp Expert") {
            window.open("https://wa.me/254700000000", "_blank");
            return;
        }
        if (option === "Browse Shop") {
            window.location.href = "/products";
            return;
        }
        handleSend(option);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-40 md:bottom-24 right-6 bg-melagri-primary text-white w-14 h-14 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center justify-center z-40 animate-bounce-slow"
                aria-label="Open AgroBot"
            >
                <span className="text-2xl">🤖</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-40 md:bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl z-50 flex flex-col border border-gray-100 overflow-hidden text-sm font-sans max-h-[500px]">
            {/* Header */}
            <div className="bg-melagri-primary p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">🤖</div>
                    <div>
                        <h3 className="font-bold">AgroBot</h3>
                        <div className="flex items-center gap-1 text-xs opacity-90">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Online
                        </div>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-grow p-4 overflow-y-auto bg-gray-50 space-y-4 h-80">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl ${msg.sender === 'user'
                            ? 'bg-melagri-primary text-white rounded-tr-none'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                            }`}>
                            <p>{msg.text}</p>

                            {/* Product Results */}
                            {msg.type === 'product' && msg.data && (
                                <div className="mt-3 space-y-2">
                                    {msg.data.map((p: any) => (
                                        <Link href={`/products/${p.id}`} key={p.id} className="flex gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors border border-gray-100 items-center">
                                            {p.images && p.images[0] && (
                                                <img src={p.images[0]} alt="" className="w-10 h-10 object-cover rounded" />
                                            )}
                                            <div className="text-left">
                                                <div className="font-bold text-xs line-clamp-1">{p.name}</div>
                                                <div className="text-melagri-primary text-xs">KES {p.price}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* Options */}
                            {msg.options && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {msg.options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleOptionClick(opt)}
                                            className="text-xs bg-gray-100 hover:bg-melagri-primary hover:text-white px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100 bg-white">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2"
                >
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-grow bg-gray-100 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-melagri-primary/20 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isTyping}
                        className="bg-melagri-primary text-white p-2 rounded-xl hover:bg-melagri-secondary disabled:opacity-50 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
