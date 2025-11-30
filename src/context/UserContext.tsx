"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, updateDoc, deleteDoc, query, orderBy, getDocs } from 'firebase/firestore';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'customer';
    joinDate: string;
    status: 'active' | 'inactive';
}

interface UserContextType {
    users: User[];
    updateUserRole: (userId: string, role: 'admin' | 'customer') => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

import { useAuth } from './AuthContext';

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!user || user.role !== 'admin') {
                setUsers([]);
                setLoading(false);
                return;
            }

            try {
                const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                const userList: User[] = [];
                snapshot.forEach((doc) => {
                    userList.push({ ...doc.data(), id: doc.id } as User);
                });
                setUsers(userList);
            } catch (error) {
                console.error("Error fetching users:", error);
                // Don't crash
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const updateUserRole = async (userId: string, role: 'admin' | 'customer') => {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { role });
    };

    const deleteUser = async (userId: string) => {
        const userRef = doc(db, "users", userId);
        await deleteDoc(userRef);
    };

    return (
        <UserContext.Provider value={{ users, updateUserRole, deleteUser }}>
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
