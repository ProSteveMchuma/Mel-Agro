"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

import { User } from '@/types';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    isAdmin: boolean;
    logout: () => void;
    updateProfile: (data: Partial<User>) => Promise<void>;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

    useEffect(() => {
        let docUnsubscribe: (() => void) | null = null;

        const stopDocListener = () => {
            if (docUnsubscribe) {
                docUnsubscribe();
                docUnsubscribe = null;
            }
        };

        const adminEmails = ['admin@melagri.com', 'admin@melagri.co.ke', 'james.wambua@makamithi.com'];

        const authUnsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            stopDocListener();

            if (!firebaseUser) {
                setUser(null);
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }

            const userEmail = (firebaseUser.email || '').toLowerCase();
            const isAdminEmail = adminEmails.some(email => email.toLowerCase() === userEmail);
            const userDocRef = doc(db, 'users', firebaseUser.uid);

            // Make sure a doc exists before we attach the live listener so we don't briefly
            // render with a `null` user during first sign-in.
            try {
                const initial = await getDoc(userDocRef);
                if (!initial.exists()) {
                    await setDoc(userDocRef, {
                        name: firebaseUser.displayName || 'User',
                        email: firebaseUser.email || '',
                        role: firebaseUser.email === 'proinnovationtech@gmail.com' ? 'super-admin' : (isAdminEmail ? 'admin' : 'user'),
                        createdAt: new Date().toISOString(),
                    });
                } else if (initial.data()?.name === 'User' && firebaseUser.displayName) {
                    // Recover legacy stubs that pre-date the signup-name fix.
                    await setDoc(userDocRef, { name: firebaseUser.displayName }, { merge: true });
                }
            } catch (e) {
                console.warn('AuthContext: failed to ensure user doc exists', e);
            }

            // Live listener: any update to users/{uid} (from checkout name save, admin
            // panel role change, profile edit, etc.) flows back into React state without
            // requiring a sign-out / sign-in cycle.
            docUnsubscribe = onSnapshot(
                userDocRef,
                (snap) => {
                    const data = snap.exists() ? (snap.data() as any) : {};
                    const role = firebaseUser.email === 'proinnovationtech@gmail.com'
                        ? 'super-admin'
                        : (isAdminEmail ? 'admin' : (data.role || 'user'));

                    setUser({
                        uid: firebaseUser.uid,
                        name: data.name || firebaseUser.displayName || 'User',
                        email: firebaseUser.email || '',
                        role,
                        phone: data.phone || firebaseUser.phoneNumber || undefined,
                        address: data.address,
                        city: data.city,
                        county: data.county,
                        loyaltyPoints: data.loyaltyPoints || 0,
                        savedAddresses: data.savedAddresses || [],
                    });
                    setIsAuthenticated(true);
                    setIsLoading(false);
                },
                (err) => {
                    console.error('AuthContext: user-doc listener error:', err);
                    setIsLoading(false);
                }
            );
        });

        return () => {
            stopDocListener();
            authUnsubscribe();
        };
    }, []);



    const logout = async () => {
        try {
            await auth.signOut();
            router.push('/');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const updateProfile = async (data: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...data };
            setUser(updatedUser);

            // Persist to Firestore
            try {
                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, {
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    phone: updatedUser.phone || null,
                    address: updatedUser.address || null,
                    city: updatedUser.city || null,
                    county: updatedUser.county || null,
                    loyaltyPoints: updatedUser.loyaltyPoints || 0,
                    savedAddresses: updatedUser.savedAddresses || []
                }, { merge: true });
            } catch (error) {
                console.error("Error updating user profile:", error);
            }
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, user, isAdmin, logout, updateProfile, updateUserProfile: updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
