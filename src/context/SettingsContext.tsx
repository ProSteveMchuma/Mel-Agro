"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";

export interface GeneralSettings {
    companyName: string;
    logoUrl: string;
    supportEmail: string;
    supportPhone: string;
    currency: string;
    address: string;
    websiteUrl: string;
}

export interface TaxSettings {
    taxRate: number; // Percentage
    taxId: string; // KRA PIN
    enabled: boolean;
}

export interface NotificationSettings {
    emailEnabled: boolean;
    smsEnabled: boolean;
    orderConfirmationTemplate: string;
    shippingNotificationTemplate: string;
}

interface SettingsContextType {
    general: GeneralSettings;
    tax: TaxSettings;
    notifications: NotificationSettings;
    loading: boolean;
    updateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>;
    updateTaxSettings: (settings: Partial<TaxSettings>) => Promise<void>;
    updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
}

const defaultGeneral: GeneralSettings = {
    companyName: "MelAgro",
    logoUrl: "",
    supportEmail: "support@melagro.com",
    supportPhone: "+254 700 000 000",
    currency: "KES",
    address: "P.O. Box 123, Nairobi, Kenya",
    websiteUrl: "https://melagro.com"
};

const defaultTax: TaxSettings = {
    taxRate: 16,
    taxId: "",
    enabled: true
};

const defaultNotifications: NotificationSettings = {
    emailEnabled: true,
    smsEnabled: false,
    orderConfirmationTemplate: "Your order #{orderId} has been confirmed. Total: {total}",
    shippingNotificationTemplate: "Your order #{orderId} has been shipped. Track it here: {trackingUrl}"
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [general, setGeneral] = useState<GeneralSettings>(defaultGeneral);
    const [tax, setTax] = useState<TaxSettings>(defaultTax);
    const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to 'settings/general'
        const unsubGeneral = onSnapshot(doc(db, "settings", "general"), (doc) => {
            if (doc.exists()) {
                setGeneral({ ...defaultGeneral, ...doc.data() } as GeneralSettings);
            }
        });

        // Subscribe to 'settings/tax'
        const unsubTax = onSnapshot(doc(db, "settings", "tax"), (doc) => {
            if (doc.exists()) {
                setTax({ ...defaultTax, ...doc.data() } as TaxSettings);
            }
        });

        // Subscribe to 'settings/notifications'
        const unsubNotif = onSnapshot(doc(db, "settings", "notifications"), (doc) => {
            if (doc.exists()) {
                setNotifications({ ...defaultNotifications, ...doc.data() } as NotificationSettings);
            }
            setLoading(false);
        });

        return () => {
            unsubGeneral();
            unsubTax();
            unsubNotif();
        };
    }, []);

    const updateGeneralSettings = async (settings: Partial<GeneralSettings>) => {
        const ref = doc(db, "settings", "general");
        await setDoc(ref, settings, { merge: true });
    };

    const updateTaxSettings = async (settings: Partial<TaxSettings>) => {
        const ref = doc(db, "settings", "tax");
        await setDoc(ref, settings, { merge: true });
    };

    const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
        const ref = doc(db, "settings", "notifications");
        await setDoc(ref, settings, { merge: true });
    };

    return (
        <SettingsContext.Provider value={{
            general,
            tax,
            notifications,
            loading,
            updateGeneralSettings,
            updateTaxSettings,
            updateNotificationSettings
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
