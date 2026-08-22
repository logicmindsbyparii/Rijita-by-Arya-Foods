import type { Metadata, Viewport } from "next";
import { Marcellus, Plus_Jakarta_Sans, Cinzel, Playfair_Display, Outfit } from "next/font/google";
import { QueryProvider, LayoutWrapper } from "@/lib/providers";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { Toaster } from "react-hot-toast";
import StructuredData from "@/components/seo/StructuredData";
import { getServerApiBase, fetchServerJson } from "@shared/api";
import { getImageUrl } from "@/lib/utils";
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
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

/* Display face per DESIGN.md — Outfit Sans weight 800/900. The serif is
   reserved for the italic-gold editorial accent (see font-serif below). */
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
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

export async function generateMetadata(): Promise<Metadata> {
  const settingsData = await fetchServerJson(`${getServerApiBase()}/settings`);
  const settings = settingsData?.data?.settings || {};
  const siteName = settings.siteName || "RIJITA by Arya Foods";
  const tagline = settings.tagline || "Premium Namkeen & Snacks";
  const aboutText = settings.footer?.aboutText || "Discover premium quality Jain namkeen, snacks, and traditional Indian food products from RIJITA by Arya Foods. Authentic taste, pure ingredients, delivered to your doorstep.";
  
  const favicon = settings.favicon ? getImageUrl(settings.favicon) : "/icons/icon.svg";
  const logo = settings.logo ? getImageUrl(settings.logo) : "/og-image.jpg";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: {
      default: `${siteName} | ${tagline}`,
      template: `%s | ${siteName}`,
    },
    description: aboutText,
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
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    applicationName: "RIJITA",
    icons: {
      icon: favicon,
      apple: favicon,
    },
    openGraph: {
      title: siteName,
      description: tagline,
      type: "website",
      locale: "en_IN",
      siteName: siteName,
      url: "/",
      images: [
        {
          url: logo,
          width: 1200,
          height: 630,
          alt: `${siteName} - ${tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: tagline,
      images: [logo],
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
      title: siteName,
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${marcellus.variable} ${jakarta.variable} ${cinzel.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <StructuredData />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){'use strict';try{var s=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(n&&n.indexOf('data-dashlane-')===0)return;s.call(this,n,v)};var n=new MutationObserver(function(m){m.forEach(function(mut){if(mut.type==='attributes'){var name=mut.attributeName;if(name&&name.indexOf('data-dashlane-')===0)mut.target.removeAttribute(name)}})});n.observe(document.documentElement,{attributes:true,subtree:true,attributeOldValue:false})}catch(e){}})()`
        }} />
      </head>
      <body className="min-h-screen flex flex-col relative overflow-x-hidden w-full max-w-[100vw]" suppressHydrationWarning>
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
