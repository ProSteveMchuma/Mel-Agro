"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'sw';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations = {
    en: {
        'nav.home': 'Home',
        'nav.products': 'Products',
        'nav.about': 'About Us',
        'nav.dashboard': 'Dashboard',
        'nav.login': 'Login',
        'nav.cart': 'Cart',
        'search.placeholder': 'Search for seeds, fertilizer...',
        'hero.title': 'Quality Farm Inputs,',
        'hero.subtitle': 'Delivered to Your Farm',
        'hero.cta': 'Shop Now',
        'footer.links': 'Quick Links',
        'footer.contact': 'Contact Us'
    },
    sw: {
        'nav.home': 'Nyumbani',
        'nav.products': 'Bidhaa',
        'nav.about': 'Kutuhusu',
        'nav.dashboard': 'Dashibodi',
        'nav.login': 'Ingia',
        'nav.cart': 'Roli',
        'search.placeholder': 'Tafuta mbegu, mbolea...',
        'hero.title': 'Pembejeo Bora,',
        'hero.subtitle': 'Zinazofika Shambani Kwako',
        'hero.cta': 'Nunua Sasa',
        'footer.links': 'Viungo vya Haraka',
        'footer.contact': 'Wasiliana Nasi'
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        const savedLang = localStorage.getItem('Mel-Agri_lang') as Language;
        if (savedLang) setLanguage(savedLang);
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('Mel-Agri_lang', lang);
    };

    const t = (key: string) => {
        // @ts-ignore
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
