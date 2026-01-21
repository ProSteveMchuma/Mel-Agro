"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, query, orderBy, getDocs, where, onSnapshot, QuerySnapshot, getDoc, increment, runTransaction } from 'firebase/firestore';
import { useAuth } from './AuthContext';

import { Order, OrderItem } from '@/types';
export type { Order, OrderItem };

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
    handleConfirmReceipt: (orderId: string) => Promise<void>;
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
        if (user.role === 'admin' || user.role === 'super-admin') {
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
        const orderId = doc(collection(db, "orders")).id;
        const date = new Date().toISOString();

        await runTransaction(db, async (transaction) => {
            // 1. Verify Stock for all items first
            const productRefs = orderData.items.map(item => ({
                ref: doc(db, "products", String(item.id)),
                quantity: item.quantity,
                name: item.name
            }));

            const productSnaps = await Promise.all(productRefs.map(p => transaction.get(p.ref)));

            // Check if any product is out of stock
            for (let i = 0; i < productSnaps.length; i++) {
                const snap = productSnaps[i];
                const requestedQty = productRefs[i].quantity;
                if (!snap.exists()) {
                    throw new Error(`Product ${productRefs[i].name} does not exist.`);
                }
                const data = snap.data();
                if (!data) {
                    throw new Error(`Product ${productRefs[i].name} has no data.`);
                }
                const stock = data.stockQuantity || 0;
                if (stock < requestedQty) {
                    throw new Error(`Insufficient stock for ${productRefs[i].name}. Only ${stock} left.`);
                }
            }

            // 2. Create the Order
            const newOrderRef = doc(db, "orders", orderId);
            const newOrderBase = {
                ...orderData,
                id: orderId,
                date,
                status: 'Processing' as const,
            };
            transaction.set(newOrderRef, newOrderBase);

            // 3. Create User Notification
            const userNotifRef = doc(collection(db, 'notifications'));
            transaction.set(userNotifRef, {
                userId: orderData.userId,
                message: `Order #${orderId.substr(0, 5)} has been placed successfully!`,
                date,
                read: false,
                type: 'order'
            });

            // 4. Update Stock and Log Inventory History for each item
            for (let i = 0; i < productSnaps.length; i++) {
                const snap = productSnaps[i];
                const p = productRefs[i];
                const updateData = snap.data();
                if (!updateData) continue; // Should not happen given exists check above

                const currentStock = updateData.stockQuantity || 0;
                const newStock = currentStock - p.quantity;

                transaction.update(p.ref, {
                    stockQuantity: newStock,
                    inStock: newStock > 0
                });

                const historyRef = doc(collection(db, "inventory_history"));
                transaction.set(historyRef, {
                    productId: String(p.ref.id),
                    productName: p.name,
                    previousStock: currentStock,
                    newStock: newStock,
                    change: -p.quantity,
                    updatedBy: 'System (Atomic Order)',
                    updatedAt: date,
                    orderId: orderId
                });
            }
        });

        // Async: Notify Admins (Failure here doesn't roll back the order)
        try {
            const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
            const adminDocs = await getDocs(adminsQuery);
            adminDocs.forEach(async (adminDoc) => {
                await addDoc(collection(db, 'notifications'), {
                    userId: adminDoc.id,
                    message: `New Order #${orderId.substr(0, 5)} placed by ${orderData.userEmail || 'Customer'}`,
                    date,
                    read: false,
                    type: 'system'
                });
            });
        } catch (error) {
            console.warn("Failed to notify admins, but order was placed:", error);
        }

        return {
            ...orderData,
            id: orderId,
            date,
            status: 'Processing' as const,
        } as Order;
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

    const handleConfirmReceipt = async (orderId: string) => {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status: 'Delivered' });

        // Create Notification
        const order = orders.find(o => o.id === orderId);
        if (order) {
            try {
                await addDoc(collection(db, 'notifications'), {
                    userId: order.userId,
                    message: `Order #${orderId.slice(0, 5)} has been successfully delivered and confirmed.`,
                    date: new Date().toISOString(),
                    read: false,
                    type: 'order'
                });
            } catch (error) {
                console.error("Error creating receipt confirmation notification:", error);
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
            handleConfirmReceipt,
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
