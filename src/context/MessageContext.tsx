"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface Message {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    subject: string;
    content: string;
    status: 'unread' | 'read' | 'replied';
    createdAt: string;
    reply?: string;
}

interface MessageContextType {
    messages: Message[];
    sendMessage: (subject: string, content: string) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    replyToMessage: (id: string, reply: string) => Promise<void>;
    unreadCount: number;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setMessages([]);
            return;
        }

        let q;
        if (user.role === 'admin') {
            // Admin sees all messages
            q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
        } else {
            // User sees only their messages
            q = query(collection(db, 'messages'), where('userId', '==', user.uid));
            // Note: Composite index might be needed for where + orderBy. 
            // If it fails, we'll sort client-side or add index.
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];

            // Client-side sort if needed (for user view if index missing)
            msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setMessages(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Error listening to messages:", error);
        });

        return () => unsubscribe();
    }, [user]);

    const sendMessage = async (subject: string, content: string) => {
        if (!user) return;

        await addDoc(collection(db, 'messages'), {
            userId: user.uid,
            userName: user.name || 'Anonymous',
            userEmail: user.email,
            subject,
            content,
            status: 'unread',
            createdAt: new Date().toISOString()
        });
    };

    const markAsRead = async (id: string) => {
        await updateDoc(doc(db, 'messages', id), { status: 'read' });
    };

    const replyToMessage = async (id: string, reply: string) => {
        await updateDoc(doc(db, 'messages', id), {
            reply,
            status: 'replied'
        });
    };

    const unreadCount = messages.filter(m => m.status === 'unread').length;

    return (
        <MessageContext.Provider value={{ messages, sendMessage, markAsRead, replyToMessage, unreadCount }}>
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
