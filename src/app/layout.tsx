import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { OrderProvider } from "@/context/OrderContext";
import { ProductProvider } from "@/context/ProductContext";
import { UserProvider } from "@/context/UserContext";
import { WishlistProvider } from "@/context/WishlistContext";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { SettingsProvider } from "@/context/SettingsContext";
import { MessageProvider } from "@/context/MessageContext";
import { ContentProvider } from "@/context/ContentContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from 'react-hot-toast';
import ChatWidget from "@/components/ChatWidget";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import AgroBot from "@/components/AgroBot";
import MobileNav from "@/components/MobileNav";
import { BehaviorProvider } from "@/context/BehaviorContext";
import TrafficTracker from "@/components/TrafficTracker";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: 0,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://Mel-Agri.com'),
  title: {
    default: "Mel-Agri | Premium Fertilizers, Certified Seeds & Ag-Tech Kenya",
    template: "%s | Mel-Agri"
  },
  description: "Shop certified hybrid seeds, high-yield fertilizers, and precision crop protection at Mel-Agri. Kenya's premier digital hub for quality agricultural inputs and expert advice.",
  keywords: [
    "maize seeds kenya",
    "DAP fertilizer price kenya",
    "agricultural inputs nairobi",
    "hybrid seeds kenya",
    "Mel-Agri agri-tech",
    "can fertilizer kenya",
    "certified agrochemicals kenya",
    "farming tools nairobi"
  ],
  authors: [{ name: "Mel-Agri" }],
  creator: "Mel-Agri",
  publisher: "Mel-Agri",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://Mel-Agri.com',
    title: 'Mel-Agri | Kenya\'s Premier Agricultural Hub',
    description: 'Empowering Kenyan farmers with certified seeds, premium fertilizers, and expert agricultural advice.',
    siteName: 'Mel-Agri',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Mel-Agri Agricultural Solutions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mel-Agri | Kenya\'s Premier Agricultural Hub',
    description: 'Empowering Kenyan farmers with certified seeds, premium fertilizers, and expert agricultural advice.',
    images: ['/og-image.jpg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mel-Agri",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  verification: {
    google: 'google-site-verification-id', // Needs to be updated with real ID
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SettingsProvider>
            <ContentProvider>
              <CartProvider>
                <OrderProvider>
                  <ProductProvider>
                    <UserProvider>
                      <LanguageProvider>
                        <MessageProvider>
                          <BehaviorProvider>
                            <WishlistProvider>
                              {children}
                              {/* <PWAInstallPrompt /> - Disabled by user request */}
                              <MobileNav />
                              {/* <ChatWidget /> - Replacing basic widget with AI Bot */}
                              <WhatsAppButton />
                              <TrafficTracker />
                              <Toaster position="top-center" toastOptions={{
                                duration: 3000,
                                style: {
                                  background: '#333',
                                  color: '#fff',
                                },
                                success: {
                                  style: {
                                    background: '#10B981',
                                  },
                                },
                                error: {
                                  style: {
                                    background: '#EF4444',
                                  },
                                },
                              }} />
                            </WishlistProvider>
                          </BehaviorProvider>
                        </MessageProvider>
                      </LanguageProvider>
                    </UserProvider>
                  </ProductProvider>
                </OrderProvider>
                <CartDrawer />
              </CartProvider>
            </ContentProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
