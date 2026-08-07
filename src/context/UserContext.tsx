"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, QuerySnapshot, QueryDocumentSnapshot, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { usePathname } from 'next/navigation';

import { User } from '@/types';

interface UserContextType {
    users: User[];
    updateUserRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
    updateUserStatus: (userId: string, status: 'active' | 'suspended') => Promise<void>;
    updateStaffPermissions: (userId: string, staffProfile: string, permissions: string[]) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

import { useAuth } from './AuthContext';

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const pathname = usePathname();

    useEffect(() => {
        let unsubscribe: () => void;

        const setupRealtimeListener = async () => {
            const adminUserRoutes = ['/dashboard/admin', '/dashboard/admin/users', '/dashboard/admin/intelligence', '/dashboard/admin/orders/create'];
            const needsAdminUsers = adminUserRoutes.some((route) => pathname === route || (route !== '/dashboard/admin' && pathname.startsWith(`${route}/`)));
            if (!user || (user.role !== 'admin' && user.role !== 'super-admin') || !needsAdminUsers) {
                setUsers([]);
                return;
            }

            try {
                // Cap admin live stream. Beyond 500 users, the dedicated /dashboard/admin/users
                // page should add its own paginated query rather than relying on this context.
                const q = query(collection(db, "users"), limit(500));

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
                }, (error: Error) => {
                    console.error("Error listening to users:", error);
                });

            } catch (error) {
                console.error("Error setting up user listener:", error);
            }
        };

        setupRealtimeListener();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [pathname, user]);

    const mutateUser = async (body: Record<string, unknown>) => {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error('Admin session is unavailable.');
        const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'User update failed.');
    };

    const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
        try {
            await mutateUser({ action: 'role', userId, role });
            setUsers((prev: User[]) => prev.map((u: User) => u.id === userId ? { ...u, role: role as any } : u));
        } catch (error) {
            console.error("Error updating user role:", error);
            throw error;
        }
    };

    const updateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
        try {
            await mutateUser({ action: 'status', userId, status });
            setUsers((prev: User[]) => prev.map((u: User) => u.id === userId ? { ...u, status } : u));
        } catch (error) {
            console.error("Error updating user status:", error);
            throw error;
        }
    };

    const deleteUser = async (userId: string) => {
        await mutateUser({ action: 'delete', userId });
    };

    const updateStaffPermissions = async (userId: string, staffProfile: string, permissions: string[]) => {
        await mutateUser({ action: 'permissions', userId, staffProfile, permissions });
        setUsers((prev) => prev.map((entry) => entry.id === userId ? { ...entry, role: 'admin', staffProfile, adminPermissions: permissions } : entry));
    };

    return (
        <UserContext.Provider value={{ users, updateUserRole, updateUserStatus, updateStaffPermissions, deleteUser }}>
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
