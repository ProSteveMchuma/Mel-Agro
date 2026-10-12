"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, query, orderBy, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    createdAt: any; // Timestamp
    type: 'text' | 'order-proposal';
    proposalData?: {
        items: any[];
        total: number;
    };
}

export interface Conversation {
    id: string; // userId
    userName: string;
    userEmail?: string;
    lastMessage: string;
    lastMessageAt: any;
    unreadCount: number;
}

interface MessageContextType {
    conversations: Conversation[];
    activeConversationId: string | null;
    setActiveConversationId: (id: string | null) => void;
    messages: ChatMessage[]; // Messages for the active conversation
    sendMessage: (content: string, type?: 'text' | 'order-proposal', proposalData?: any) => Promise<void>;
    loading: boolean;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [conversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading] = useState(false);

    // The support inbox loads its own list. Do not stream conversations or threads on the shop.
    useEffect(() => {
        if (!activeConversationId) {
            setMessages([]);
            return;
        }

        const q = query(
            collection(db, 'conversations', activeConversationId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[];
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [activeConversationId]);

    const sendMessage = async (content: string, type: 'text' | 'order-proposal' = 'text', proposalData?: any) => {
        if (!user) return;

        // Determine target conversation ID
        // If Admin: activeConversationId
        // If User: user.uid
        const targetId = (user.role === 'admin' || user.role === 'super-admin') ? activeConversationId : user.uid;

        if (!targetId) {
            console.error("No target conversation ID");
            return;
        }

        const messageData = {
            senderId: user.uid,
            senderName: user.name || 'User',
            content,
            createdAt: serverTimestamp(),
            type,
            ...(proposalData && { proposalData })
        };

        // Add to subcollection
        await addDoc(collection(db, 'conversations', targetId, 'messages'), messageData);

        // Update conversation document (summary)
        await setDoc(doc(db, 'conversations', targetId), {
            id: targetId,
            userName: (user.role === 'admin' || user.role === 'super-admin') ? conversations.find(c => c.id === targetId)?.userName : user.name, // Maintain user name
            userEmail: ((user.role === 'admin' || user.role === 'super-admin') ? conversations.find(c => c.id === targetId)?.userEmail : user.email) || '',
            lastMessage: type === 'order-proposal' ? '📦 Sent an Order Proposal' : content,
            lastMessageAt: serverTimestamp(),
            unreadCount: 0 // Resetting logic would go here ideally 
        }, { merge: true });
    };

    return (
        <MessageContext.Provider value={{
            conversations,
            activeConversationId,
            setActiveConversationId,
            messages,
            sendMessage,
            loading
        }}>
            {children}
        </MessageContext.Provider>
    );
}

export function useMessages() {
    const context = useContext(MessageContext);
    if (context === undefined) {
        throw new Error('useMessages must be used within a MessageProvider');
    }
    return context;
}
