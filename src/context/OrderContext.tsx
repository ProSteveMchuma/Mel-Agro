"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, query, orderBy, getDocs, where, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface OrderItem {
    id: string | number;
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

export interface Order {
    id: string;
    userId: string;
    userEmail?: string;
    date: string;
    status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
    items: OrderItem[];
    total: number;
    shippingCost: number;
    paymentMethod: string;
    shippingAddress: {
        county: string;
        details: string;
    };
    paymentStatus?: 'Paid' | 'Unpaid';
    notificationPreferences?: string[];
}

export interface Notification {
    id: number;
    userId: string;
    message: string;
    date: string;
    read: boolean;
    type: 'order' | 'system' | 'promo';
}

interface OrderContextType {
    orders: Order[];
    notifications: Notification[];
    addOrder: (order: Omit<Order, 'id' | 'date' | 'status'>) => Promise<Order>;
    updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
    markNotificationRead: (id: number) => void;
    unreadNotificationsCount: number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }

        let q;
        if (user.role === 'admin') {
            q = query(collection(db, 'orders'), orderBy('date', 'desc'));
        } else {
            // Temporarily remove orderBy to avoid needing a composite index immediately
            q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        }

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
            const orderList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];
            setOrders(orderList);
            setLoading(false);
        }, (error: Error) => {
            console.error("Error listening to orders:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const addOrder = async (orderData: Omit<Order, 'id' | 'date' | 'status'>) => {
        const newOrderBase = {
            ...orderData,
            date: new Date().toISOString(),
            status: 'Processing' as const,
        };

        const docRef = await addDoc(collection(db, "orders"), newOrderBase);
        const newOrder = { ...newOrderBase, id: docRef.id };

        // Add local notification
        const newNotification: Notification = {
            id: Date.now(),
            userId: orderData.userId,
            message: `Order #${docRef.id.substr(0, 5)} has been placed successfully!`,
            date: new Date().toLocaleTimeString(),
            read: false,
            type: 'order'
        };
        setNotifications(prev => [newNotification, ...prev]);

        return newOrder;
    };

    const updateOrderStatus = async (orderId: string, status: Order['status']) => {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status });

        const order = orders.find(o => o.id === orderId);
        if (order) {
            const newNotification: Notification = {
                id: Date.now(),
                userId: order.userId,
                message: `Order #${orderId.substr(0, 5)} status updated to ${status}`,
                date: new Date().toLocaleTimeString(),
                read: false,
                type: 'order'
            };
            setNotifications(prev => [newNotification, ...prev]);
        }
    };

    const markNotificationRead = (id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const userNotifications = user ? notifications.filter(n => n.userId === user.uid) : [];
    const unreadNotificationsCount = userNotifications.filter(n => !n.read).length;

    return (
        <OrderContext.Provider value={{
            orders,
            notifications: userNotifications,
            addOrder,
            updateOrderStatus,
            markNotificationRead,
            unreadNotificationsCount
        }}>
            {children}
        </OrderContext.Provider>
    );
}

export function useOrders() {
    const context = useContext(OrderContext);
    if (context === undefined) {
        throw new Error('useOrders must be used within an OrderProvider');
    }
    return context;
}
