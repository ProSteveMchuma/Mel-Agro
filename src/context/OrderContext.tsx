"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, query, orderBy, getDocs, where, onSnapshot, QuerySnapshot, getDoc, increment } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export type { Order, OrderItem } from '@/types';

export interface Notification {
    id: string;
    userId: string;
    message: string;
    date: string;
    read: boolean;
    type: 'order' | 'system' | 'promo';
}

export interface Notification {
    id: string;
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
    updateOrderPaymentStatus: (orderId: string, paymentStatus: 'Paid' | 'Unpaid') => Promise<void>;
    requestReturn: (orderId: string, reason: string) => Promise<void>;
    updateReturnStatus: (orderId: string, status: 'Approved' | 'Rejected') => Promise<void>;
    markNotificationRead: (id: string) => Promise<void>;
    unreadNotificationsCount: number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch Orders
    useEffect(() => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }

        let q;
        if (user.role === 'admin') {
            // Remove orderBy to avoid missing index issue
            q = query(collection(db, 'orders'));
        } else {
            q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        }

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
            const orderList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];
            // Client-side sort for everyone
            orderList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setOrders(orderList);
            setLoading(false);
        }, (error: Error) => {
            console.error("Error listening to orders:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch Notifications
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];

            // Client-side sort
            notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setNotifications(notifs);
        }, (error) => {
            console.error("Error listening to notifications:", error);
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

        // Create Notification for User
        try {
            await addDoc(collection(db, 'notifications'), {
                userId: orderData.userId,
                message: `Order #${docRef.id.substr(0, 5)} has been placed successfully!`,
                date: new Date().toISOString(),
                read: false,
                type: 'order'
            });
        } catch (error) {
            console.error("Error creating user notification:", error);
        }

        // Create Notification for Admins
        try {
            const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
            const adminDocs = await getDocs(adminsQuery);
            adminDocs.forEach(async (adminDoc) => {
                await addDoc(collection(db, 'notifications'), {
                    userId: adminDoc.id,
                    message: `New Order #${docRef.id.substr(0, 5)} placed by ${orderData.userEmail || 'Customer'}`,
                    date: new Date().toISOString(),
                    read: false,
                    type: 'system'
                });
            });
        } catch (error) {
            console.error("Error notifying admins:", error);
        }

        // Update Stock
        try {
            for (const item of orderData.items) {
                const productRef = doc(db, "products", String(item.id));
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const currentStock = productSnap.data().stockQuantity || 0;
                    const newStock = Math.max(0, currentStock - item.quantity);

                    await updateDoc(productRef, {
                        stockQuantity: newStock,
                        inStock: newStock > 0
                    });

                    // Log Inventory History
                    await addDoc(collection(db, "inventory_history"), {
                        productId: String(item.id),
                        productName: item.name,
                        previousStock: currentStock,
                        newStock: newStock,
                        change: -item.quantity,
                        updatedBy: 'System (Order)',
                        updatedAt: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.error("Error updating stock:", error);
        }

        return newOrder;
    };

    const updateOrderStatus = async (orderId: string, status: Order['status']) => {
        const orderRef = doc(db, "orders", orderId);

        // Check previous status to handle stock restoration
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return;

        const previousStatus = orderSnap.data().status;
        const orderData = orderSnap.data();

        await updateDoc(orderRef, { status });

        // Award Loyalty Points if delivered
        if (status === 'Delivered') {
            const pointsToAward = Math.floor(orderData.total / 100);
            try {
                const userRef = doc(db, 'users', orderData.userId);
                await updateDoc(userRef, {
                    loyaltyPoints: increment(pointsToAward)
                });
            } catch (error) {
                console.error("Error awarding points:", error);
            }
        }

        // Restore stock if cancelling
        if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
            const orderItems = orderData.items as OrderItem[];
            try {
                for (const item of orderItems) {
                    const productRef = doc(db, "products", String(item.id));
                    const productSnap = await getDoc(productRef);

                    if (productSnap.exists()) {
                        const currentStock = productSnap.data().stockQuantity || 0;
                        const newStock = currentStock + item.quantity;

                        await updateDoc(productRef, {
                            stockQuantity: newStock,
                            inStock: newStock > 0
                        });

                        // Log Inventory History
                        await addDoc(collection(db, "inventory_history"), {
                            productId: String(item.id),
                            productName: item.name,
                            previousStock: currentStock,
                            newStock: newStock,
                            change: item.quantity,
                            updatedBy: 'System (Cancellation)',
                            updatedAt: new Date().toISOString()
                        });
                    }
                }
            } catch (error) {
                console.error("Error restoring stock:", error);
            }
        }

        const order = orders.find(o => o.id === orderId);
        if (order) {
            // Create Notification in Firestore
            try {
                await addDoc(collection(db, 'notifications'), {
                    userId: order.userId,
                    message: `Order #${orderId.slice(0, 5)} status updated to ${status}`,
                    date: new Date().toISOString(),
                    read: false,
                    type: 'order'
                });
            } catch (error) {
                console.error("Error creating status update notification:", error);
            }

            // Send SMS Notification
            if (order.phone) {
                import('@/lib/sms').then(({ SmsService }) => {
                    SmsService.sendOrderUpdate(
                        order.phone!,
                        orderId,
                        status,
                        order.userName || "Customer"
                    );
                });
            }
        }
    };

    const updateOrderPaymentStatus = async (orderId: string, paymentStatus: 'Paid' | 'Unpaid') => {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { paymentStatus });
    };

    const requestReturn = async (orderId: string, reason: string) => {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
            returnStatus: 'Requested',
            returnReason: reason
        });

        // Notify Admins
        try {
            const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
            const adminDocs = await getDocs(adminsQuery);
            adminDocs.forEach(async (adminDoc) => {
                await addDoc(collection(db, 'notifications'), {
                    userId: adminDoc.id,
                    message: `Return Requested for Order #${orderId.substr(0, 5)}`,
                    date: new Date().toISOString(),
                    read: false,
                    type: 'system'
                });
            });
        } catch (error) {
            console.error("Error notifying admins:", error);
        }
    };

    const updateReturnStatus = async (orderId: string, status: 'Approved' | 'Rejected') => {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { returnStatus: status });

        const order = orders.find(o => o.id === orderId);
        if (order) {
            try {
                await addDoc(collection(db, 'notifications'), {
                    userId: order.userId,
                    message: `Your return request for Order #${orderId.substr(0, 5)} has been ${status}`,
                    date: new Date().toISOString(),
                    read: false,
                    type: 'order'
                });
            } catch (error) {
                console.error("Error creating return status notification:", error);
            }
        }
    };

    const markNotificationRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        const notifRef = doc(db, 'notifications', id);
        await updateDoc(notifRef, { read: true });
    };

    const unreadNotificationsCount = notifications.filter(n => !n.read).length;

    return (
        <OrderContext.Provider value={{
            orders,
            notifications,
            addOrder,
            updateOrderStatus,
            updateOrderPaymentStatus,
            requestReturn,
            updateReturnStatus,
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
