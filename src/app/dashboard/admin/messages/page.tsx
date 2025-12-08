"use client";
import { useState, useEffect, useRef } from 'react';
import { useMessages, ChatMessage } from '@/context/MessageContext';
import { useProducts } from '@/context/ProductContext';
import Image from 'next/image';

export default function AdminChatPage() {
    const { conversations, activeConversationId, setActiveConversationId, messages, sendMessage, loading } = useMessages();
    const { products } = useProducts();
    const [input, setInput] = useState('');
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [searchProduct, setSearchProduct] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeConversationId) return;
        await sendMessage(input);
        setInput('');
    };

    const handleSendProposal = async (product: any) => {
        if (!activeConversationId) return;

        const quantity = 1; // Default to 1 for quick proposal
        const proposalData = {
            items: [{
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                image: product.image
            }],
            total: product.price * quantity
        };

        await sendMessage("Proposed Order", 'order-proposal', proposalData);
        setShowProductPicker(false);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchProduct.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-140px)] flex gap-6">
            {/* Left: Conversation List */}
            <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-bold text-gray-800">Conversations</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No active chats</div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setActiveConversationId(conv.id)}
                                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${activeConversationId === conv.id ? 'bg-blue-50 border-l-4 border-l-melagro-primary' : ''}`}
                            >
                                <div className="font-bold text-gray-900 truncate">{conv.userName || 'Anonymous'}</div>
                                <div className="text-xs text-gray-500 truncate mb-1">{conv.userEmail}</div>
                                <div className="text-sm text-gray-600 truncate">{conv.lastMessage}</div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                    {conv.lastMessageAt?.toDate ? conv.lastMessageAt.toDate().toLocaleString() : ''}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Middle: Chat Window */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative">
                {activeConversationId ? (
                    <>
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-900">
                                    {conversations.find(c => c.id === activeConversationId)?.userName}
                                </h3>
                                <div className="text-xs text-gray-500">
                                    {conversations.find(c => c.id === activeConversationId)?.userEmail}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowProductPicker(!showProductPicker)}
                                className="px-3 py-1.5 bg-melagro-primary text-white text-xs font-bold rounded-lg hover:bg-melagro-secondary flex items-center gap-1"
                            >
                                + Create Proposal
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                            {messages.map(msg => {
                                const isMe = msg.senderId !== activeConversationId; // Admin is "Me" here? No, wait.
                                // In Admin view: 
                                // senderId == admin.uid (which we don't track easily here, but we know user.uid === admin)
                                // Actually, better check: senderId === activeConversationId ? 'Them' : 'Me'
                                const isCustomer = msg.senderId === activeConversationId;

                                return (
                                    <div key={msg.id} className={`flex flex-col max-w-[70%] ${isCustomer ? 'self-start' : 'self-end items-end'}`}>
                                        <div className={`text-xs mb-1 text-gray-500 ${isCustomer ? 'ml-1' : 'mr-1'}`}>
                                            {isCustomer ? msg.senderName : 'You'}
                                        </div>
                                        {msg.type === 'order-proposal' ? (
                                            <div className="bg-white border-2 border-green-500 rounded-xl p-4 shadow-sm w-64">
                                                <div className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wide">📦 Order Proposal Sent</div>
                                                <div className="space-y-1 mb-2 text-sm">
                                                    {msg.proposalData?.items.map((item: any, i: number) => (
                                                        <div key={i}>
                                                            <span className="font-bold">{item.quantity}x</span> {item.name}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="font-bold text-gray-900">Total: KES {msg.proposalData?.total.toLocaleString()}</div>
                                            </div>
                                        ) : (
                                            <div className={`p-3 rounded-2xl text-sm ${!isCustomer ? 'bg-melagro-primary text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                                {msg.content}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-gray-400 mt-1">
                                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-grow px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="p-2 bg-melagro-primary text-white rounded-full hover:bg-melagro-secondary disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </form>

                        {/* Product Picker Slide-over */}
                        {showProductPicker && (
                            <div className="absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-200 z-10">
                                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <h4 className="font-bold text-gray-800 text-sm">Select Product</h4>
                                    <button onClick={() => setShowProductPicker(false)} className="text-gray-400 hover:text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="p-3">
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchProduct}
                                        onChange={(e) => setSearchProduct(e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg focus:outline-none"
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {filteredProducts.slice(0, 10).map(product => (
                                        <div key={product.id} className="flex gap-2 items-center p-2 border border-gray-100 rounded-lg hover:bg-gray-50">
                                            <div className="w-10 h-10 bg-gray-200 rounded shrink-0 relative overflow-hidden">
                                                {product.image && <Image src={product.image} alt={product.name} fill className="object-cover" />}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="text-xs font-bold text-gray-900 truncate">{product.name}</div>
                                                <div className="text-xs text-green-600">KES {product.price.toLocaleString()}</div>
                                            </div>
                                            <button
                                                onClick={() => handleSendProposal(product)}
                                                className="px-2 py-1 bg-melagro-primary text-white text-xs rounded hover:bg-melagro-secondary shrink-0"
                                            >
                                                Send
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}
