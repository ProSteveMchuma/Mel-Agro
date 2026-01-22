"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, updateDoc, deleteDoc, query, orderBy, getDocs, onSnapshot, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';

import { User } from '@/types';

interface UserContextType {
    users: User[];
    updateUserRole: (userId: string, role: 'admin' | 'customer') => Promise<void>;
    updateUserStatus: (userId: string, status: 'active' | 'suspended') => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

import { useAuth } from './AuthContext';

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: () => void;

        const setupRealtimeListener = async () => {
            if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
                setUsers([]);
                setLoading(false);
                return;
            }

            try {
                const q = query(collection(db, "users"));

                unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
                    const userList: User[] = [];
                    snapshot.forEach((doc: QueryDocumentSnapshot) => {
                        userList.push({ ...doc.data(), id: doc.id } as User);
                    });

                    // Client-side sort
                    userList.sort((a, b) => {
                        const dateA = a.joinDate || a.createdAt || '1970-01-01';
                        const dateB = b.joinDate || b.createdAt || '1970-01-01';
                        return new Date(dateB).getTime() - new Date(dateA).getTime();
                    });

                    setUsers(userList);
                    setLoading(false);
                }, (error: Error) => {
                    console.error("Error listening to users:", error);
                    setLoading(false);
                });

            } catch (error) {
                console.error("Error setting up user listener:", error);
                setLoading(false);
            }
        };

        setupRealtimeListener();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [user]);

    const updateUserRole = async (userId: string, role: 'admin' | 'customer') => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                role,
                updatedAt: new Date().toISOString()
            });
            setUsers((prev: User[]) => prev.map((u: User) => u.id === userId ? { ...u, role: role as any } : u));
        } catch (error) {
            console.error("Error updating user role:", error);
            throw error;
        }
    };

    const updateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                status,
                updatedAt: new Date().toISOString()
            });
            setUsers((prev: User[]) => prev.map((u: User) => u.id === userId ? { ...u, status } : u));
        } catch (error) {
            console.error("Error updating user status:", error);
            throw error;
        }
    };

    const deleteUser = async (userId: string) => {
        const userRef = doc(db, "users", userId);
        await deleteDoc(userRef);
    };

    return (
        <UserContext.Provider value={{ users, updateUserRole, updateUserStatus, deleteUser }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUsers() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUsers must be used within a UserProvider');
    }
    return context;
}
