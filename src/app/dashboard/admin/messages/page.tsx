"use client";
import { useState } from 'react';
import { useMessages, Message } from '@/context/MessageContext';

export default function AdminMessagesPage() {
    const { messages, markAsRead, replyToMessage } = useMessages();
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [reply, setReply] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleSelectMessage = (msg: Message) => {
        setSelectedMessage(msg);
        if (msg.status === 'unread') {
            markAsRead(msg.id);
        }
    };

    const handleSendReply = async () => {
        if (!selectedMessage || !reply.trim()) return;
        setIsReplying(true);
        try {
            await replyToMessage(selectedMessage.id, reply);
            setReply('');
            alert('Reply sent successfully!'); // In real app, use toast
        } catch (error) {
            console.error(error);
            alert('Failed to send reply.');
        } finally {
            setIsReplying(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Support Messages</h1>
                <div className="text-sm text-gray-500">
                    {messages.length} Total • {messages.filter(m => m.status === 'unread').length} Unread
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Message List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <input
                            type="text"
                            placeholder="Search messages..."
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagro-primary/20"
                        />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {messages.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No messages found.</div>
                        ) : (
                            messages.map(msg => (
                                <div
                                    key={msg.id}
                                    onClick={() => handleSelectMessage(msg)}
                                    className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMessage?.id === msg.id ? 'bg-blue-50' : ''} ${msg.status === 'unread' ? 'border-l-4 border-l-melagro-primary' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className={`font-medium ${msg.status === 'unread' ? 'text-gray-900' : 'text-gray-600'}`}>
                                            {msg.userName}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(msg.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-gray-800 mb-1 truncate">{msg.subject}</div>
                                    <div className="text-xs text-gray-500 truncate">{msg.content}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Message Details */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    {selectedMessage ? (
                        <>
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedMessage.subject}</h2>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span>From: <span className="font-medium text-gray-900">{selectedMessage.userName}</span> ({selectedMessage.userEmail})</span>
                                            <span>•</span>
                                            <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedMessage.status === 'unread' ? 'bg-blue-100 text-blue-700' :
                                            selectedMessage.status === 'replied' ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {selectedMessage.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                                    <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.content}</p>
                                </div>

                                {selectedMessage.reply && (
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 ml-8 mb-6">
                                        <div className="text-xs font-bold text-blue-800 mb-1">Admin Reply</div>
                                        <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.reply}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-white">
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Reply to User</h3>
                                <textarea
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagro-primary/20 mb-4"
                                    placeholder="Type your reply here..."
                                ></textarea>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSendReply}
                                        disabled={isReplying || !reply.trim()}
                                        className="btn-primary px-6"
                                    >
                                        {isReplying ? 'Sending...' : 'Send Reply'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 flex-col">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <p>Select a message to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
