import type { Metadata } from "next";
import { Geist, Geist_Mono, Arizonia } from "next/font/google";
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

const arizonia = Arizonia({
  variable: "--font-arizonia",
  weight: "400",
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
  title: {
    default: "Mel-Agro | Buy Premium Agricultural Inputs & Seeds Online Kenya",
    template: "%s | Mel-Agro"
  },
  description: "Bringing Quality Agricultural Inputs Online in Kenya. Trusted by Farmers for better Harvests. Shop certified hybrid seeds, high-yield fertilizers, and precision crop protection with fast nationwide delivery.",
  keywords: [
    "buy agricultural inputs online kenya",
    "online agrovet near me",
    "farm inputs delivery kenya",
    "agrochemicals online delivery kenya",
    "maize seeds kenya",
    "DAP fertilizer price kenya",
    "certified agrochemicals kenya"
  ],
  authors: [{ name: "Mel-Agro" }],
  creator: "Mel-Agro",
  publisher: "Mel-Agro",
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
    url: 'https://melagri.co.ke',
    title: 'Mel-Agro | Buy Premium Agricultural Inputs & Seeds Online Kenya',
    description: 'Bringing Quality Agricultural Inputs Online in Kenya. Trusted by Farmers for better Harvests. Shop certified hybrid seeds, high-yield fertilizers, and precision crop protection with fast nationwide delivery.',
    siteName: 'Mel-Agro',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Mel-Agro Agricultural Solutions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mel-Agro | Buy Premium Agricultural Inputs & Seeds Online Kenya',
    description: 'Bringing Quality Agricultural Inputs Online in Kenya. Trusted by Farmers for better Harvests.',
    images: ['/og-image.jpg'],
  },
  verification: {
    google: 'SmMoEZQ9Z1KQVluCgL0QUSjhPN9QqNwCXDUWq83DoO4',
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
        className={`${geistSans.variable} ${geistMono.variable} ${arizonia.variable} antialiased`}
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
