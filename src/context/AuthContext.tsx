"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

interface User {
    uid: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    phone?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    isAdmin: boolean;
    logout: () => void;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                // In a real app, you might fetch additional user details from Firestore here
                // For now, we'll assume the role is 'user' unless specified otherwise (e.g., via custom claims)
                // You can also check if the email matches an admin email
                const role = firebaseUser.email === 'admin@melagro.com' ? 'admin' : 'user';

                setUser({
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || 'User',
                    email: firebaseUser.email || '',
                    role: role,
                    phone: firebaseUser.phoneNumber || undefined
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

    const updateUserProfile = async (data: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...data });
            // In a real app, you would also update Firebase/Firestore here
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, user, isAdmin, logout, updateUserProfile }}>
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
