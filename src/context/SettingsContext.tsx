"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { DELIVERY_ZONES, DeliveryZone } from "@/lib/delivery";

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

export interface ShippingSettings {
    zones: DeliveryZone[];
}

interface SettingsContextType {
    general: GeneralSettings;
    tax: TaxSettings;
    notifications: NotificationSettings;
    shipping: ShippingSettings;
    loading: boolean;
    updateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>;
    updateTaxSettings: (settings: Partial<TaxSettings>) => Promise<void>;
    updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
}

const defaultGeneral: GeneralSettings = {
    companyName: "Mel-Agri",
    logoUrl: "",
    supportEmail: "support@Mel-Agri.com",
    supportPhone: "0788 970757",
    currency: "KES",
    address: "Nairobi, Kenya",
    websiteUrl: "https://Mel-Agri.com"
};

const defaultTax: TaxSettings = {
    taxRate: 16,
    taxId: "",
    enabled: true
};

const defaultNotifications: NotificationSettings = {
    emailEnabled: true,
    smsEnabled: true,
    orderConfirmationTemplate: "Thank you for your order {orderId}. Total: {total}",
    shippingNotificationTemplate: "Your order {orderId} has been shipped."
};

const defaultShipping: ShippingSettings = {
    zones: DELIVERY_ZONES
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

async function updateAdminSetting(section: "general" | "tax" | "notifications", data: unknown) {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error("Sign in again to save settings.");
    const current = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } });
    const currentData = await current.json();
    if (!current.ok) throw new Error(currentData.message || "Unable to load current settings.");
    const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ section, version: currentData.versions?.[section] || 0, data }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to save settings.");
}

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [general, setGeneral] = useState<GeneralSettings>(defaultGeneral);
    const [tax, setTax] = useState<TaxSettings>(defaultTax);
    const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
    const [shipping, setShipping] = useState<ShippingSettings>(defaultShipping);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubGeneral = onSnapshot(doc(db, "settings", "general"), (doc) => {
            if (doc.exists()) setGeneral({ ...defaultGeneral, ...doc.data() } as GeneralSettings);
        });

        const unsubTax = onSnapshot(doc(db, "settings", "tax"), (doc) => {
            if (doc.exists()) setTax({ ...defaultTax, ...doc.data() } as TaxSettings);
        });

        const unsubNotif = onSnapshot(doc(db, "settings", "notifications"), (doc) => {
            if (doc.exists()) setNotifications({ ...defaultNotifications, ...doc.data() } as NotificationSettings);
        });

        const unsubShipping = onSnapshot(doc(db, "settings", "shipping"), (doc) => {
            if (doc.exists()) setShipping({ ...defaultShipping, ...doc.data() } as ShippingSettings);
        });

        setLoading(false);

        return () => {
            unsubGeneral();
            unsubTax();
            unsubNotif();
            unsubShipping();
        };
    }, []);

    const updateGeneralSettings = async (settings: Partial<GeneralSettings>) => {
        try { await updateAdminSetting("general", { ...general, ...settings }); } catch (error) {
            console.error("Error updating general settings:", error);
            throw error;
        }
    };

    const updateTaxSettings = async (settings: Partial<TaxSettings>) => {
        try { await updateAdminSetting("tax", { ...tax, ...settings }); } catch (error) {
            console.error("Error updating tax settings:", error);
            throw error;
        }
    };

    const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
        try { await updateAdminSetting("notifications", { ...notifications, ...settings }); } catch (error) {
            console.error("Error updating notification settings:", error);
            throw error;
        }
    };

    return (
        <SettingsContext.Provider value={{
            general,
            tax,
            notifications,
            shipping,
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
