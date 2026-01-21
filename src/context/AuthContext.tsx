"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch user profile from Firestore
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);

                let userData = userDoc.exists() ? userDoc.data() : {};

                // If user document doesn't exist, create it
                if (!userDoc.exists()) {
                    const newUserData = {
                        name: firebaseUser.displayName || 'User',
                        email: firebaseUser.email || '',
                        role: firebaseUser.email === 'proinnovationtech@gmail.com' ? 'super-admin' : (['admin@melagro.com', 'james.wambua@makamithi.com'].includes(firebaseUser.email || '') ? 'admin' : 'user'),
                        createdAt: new Date().toISOString()
                    };
                    await setDoc(userDocRef, newUserData);
                    userData = newUserData;
                }

                // If user document exists but name is generic, and firebase has a display name, update it
                if (userData.name === 'User' && firebaseUser.displayName) {
                    await setDoc(userDocRef, { name: firebaseUser.displayName }, { merge: true });
                    userData.name = firebaseUser.displayName;
                }

                const role = firebaseUser.email === 'proinnovationtech@gmail.com'
                    ? 'super-admin'
                    : (['admin@melagro.com', 'james.wambua@makamithi.com'].includes(firebaseUser.email || '') ? 'admin' : (userData.role || 'user'));

                setUser({
                    uid: firebaseUser.uid,
                    name: userData.name || firebaseUser.displayName || 'User',
                    email: firebaseUser.email || '',
                    role: role,
                    phone: userData.phone || firebaseUser.phoneNumber || undefined,
                    address: userData.address,
                    city: userData.city,
                    county: userData.county
                });
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
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
                    county: updatedUser.county || null
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
