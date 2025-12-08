"use client";

import { useState, useEffect, useRef } from "react";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function ChatWidget() {
    const { user } = useAuth();
    const { messages, sendMessage, loading } = useMessages();
    const { addToCart } = useCart();
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        await sendMessage(inputText);
        setInputText("");
    };

    const handleAcceptProposal = (proposalData: any) => {
        if (!proposalData || !proposalData.items) return;

        proposalData.items.forEach((item: any) => {
            addToCart(item, item.quantity);
        });

        // Notify admin via chat
        sendMessage("✅ Accepted Order Proposal. Proceeding to checkout.", 'text');

        // Could redirect to checkout here
        // window.location.href = '/checkout';
    };

    if (!user) return null; // Only logged in users for now

    return (
        <div className="fixed bottom-6 right-6 z-[60]">
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-melagro-primary hover:bg-melagro-secondary text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col h-[500px] overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    {/* Header */}
                    <div className="bg-melagro-primary p-4 flex justify-between items-center text-white">
                        <div>
                            <div className="font-bold">MelAgro Support</div>
                            <div className="text-xs text-green-100 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                Online
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
                        {loading && <div className="text-center text-gray-400 text-xs">Loading chat...</div>}

                        {messages.map((msg) => {
                            const isMe = msg.senderId === user.uid;
                            return (
                                <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                                    {msg.type === 'order-proposal' ? (
                                        <div className="bg-white border border-green-200 rounded-2xl p-4 shadow-sm w-64">
                                            <div className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wide">Order Proposal</div>
                                            <div className="space-y-2 mb-3">
                                                {msg.proposalData?.items.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-sm">
                                                        <span>{item.quantity}x {item.name}</span>
                                                        <span className="font-bold">{item.price.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                                                    <span>Total</span>
                                                    <span>KES {msg.proposalData?.total.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAcceptProposal(msg.proposalData)}
                                                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                                            >
                                                Accept Order
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-melagro-primary text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                            {msg.content}
                                        </div>
                                    )}
                                    <span className="text-[10px] text-gray-400 mt-1">
                                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </span>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-grow px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="w-10 h-10 bg-melagro-primary text-white rounded-full flex items-center justify-center hover:bg-melagro-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
