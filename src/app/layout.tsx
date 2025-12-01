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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://melagro.com'), // Replace with actual domain
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
        url: '/og-image.jpg', // Ensure this image exists in public folder
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
          <SettingsProvider> {/* Added SettingsProvider */}
            <CartProvider>
              <OrderProvider>
                <ProductProvider>
                  <UserProvider>
                    <WishlistProvider>
                      {children}
                      <WhatsAppButton />
                    </WishlistProvider>
                  </UserProvider>
                </ProductProvider>
              </OrderProvider>
              <CartDrawer />
            </CartProvider>
          </SettingsProvider> {/* Closed SettingsProvider */}
        </AuthProvider>
      </body>
    </html>
  );
}
