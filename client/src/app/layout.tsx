import type { Metadata, Viewport } from "next";
import { Marcellus, Plus_Jakarta_Sans, Cinzel, Playfair_Display } from "next/font/google";
import { QueryProvider, LayoutWrapper } from "@/lib/providers";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { Toaster } from "react-hot-toast";
import StructuredData from "@/components/seo/StructuredData";
import "./globals.css";

const marcellus = Marcellus({
  subsets: ["latin"],
  variable: "--font-marcellus",
  display: "swap",
  weight: ["400"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1B5E20" },
    { media: "(prefers-color-scheme: dark)", color: "#0a2e0f" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "RIJITA by Arya Foods | Premium Namkeen & Snacks",
    template: "%s | RIJITA by Arya Foods",
  },
  description:
    "Discover premium quality Jain namkeen, snacks, and traditional Indian food products from RIJITA by Arya Foods. Authentic taste, pure ingredients, delivered to your doorstep.",
  keywords: [
    "namkeen",
    "jain food",
    "indian snacks",
    "arya foods",
    "rijita",
    "surat snacks",
    "traditional namkeen",
    "gujarat snacks",
    "jain namkeen online",
    "gujarati snacks",
  ],
  authors: [{ name: "RIJITA by Arya Foods" }],
  creator: "RIJITA by Arya Foods",
  publisher: "RIJITA by Arya Foods",
  applicationName: "RIJITA",
  manifest: "/manifest.json",
  openGraph: {
    title: "RIJITA by Arya Foods",
    description: "Premium Quality Namkeen & Snacks",
    type: "website",
    locale: "en_IN",
    siteName: "RIJITA by Arya Foods",
    url: "/",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "RIJITA by Arya Foods - Premium Namkeen & Snacks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RIJITA by Arya Foods",
    description: "Premium Quality Namkeen & Snacks",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "RIJITA",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${marcellus.variable} ${jakarta.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <head>
        <StructuredData />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){'use strict';try{var s=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(n&&n.indexOf('data-dashlane-')===0)return;s.call(this,n,v)};var n=new MutationObserver(function(m){m.forEach(function(mut){if(mut.type==='attributes'){var name=mut.attributeName;if(name&&name.indexOf('data-dashlane-')===0)mut.target.removeAttribute(name)}})});n.observe(document.documentElement,{attributes:true,subtree:true,attributeOldValue:false})}catch(e){}})()`
        }} />
      </head>
      <body className="min-h-screen flex flex-col relative" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: "#333",
                    color: "#fff",
                    borderRadius: "12px",
                  },
                }}
              />
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
