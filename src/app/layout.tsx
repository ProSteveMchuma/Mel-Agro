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
import { ChamaProvider } from "@/context/ChamaContext";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://melagro.com'),
  title: {
    default: "MelAgro - Premium Agricultural Solutions",
    template: "%s | MelAgro"
  },
  description: "Your trusted partner for quality agricultural inputs, certified seeds, fertilizers, and expert advice in Kenya.",
  keywords: ["agriculture", "farming", "seeds", "fertilizers", "pesticides", "Kenya", "agrochemicals", "MelAgro"],
  authors: [{ name: "MelAgro Team" }],
  creator: "MelAgro",
  publisher: "MelAgro",
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
    url: 'https://melagro.com',
    title: 'MelAgro - Premium Agricultural Solutions',
    description: 'Your trusted partner for quality agricultural inputs, certified seeds, fertilizers, and expert advice in Kenya.',
    siteName: 'MelAgro',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'MelAgro - Agricultural Solutions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MelAgro - Premium Agricultural Solutions',
    description: 'Your trusted partner for quality agricultural inputs, certified seeds, fertilizers, and expert advice in Kenya.',
    images: ['/og-image.jpg'],
  },
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
                          <ChamaProvider>
                            <WishlistProvider>
                              {children}
                              <PWAInstallPrompt />
                              <AgroBot />
                              {/* <ChatWidget /> - Replacing basic widget with AI Bot */}
                              <WhatsAppButton />
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
                          </ChamaProvider>
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
