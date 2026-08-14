"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { contentApi } from "@/lib/api";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import CookieConsent from "@/components/ui/CookieConsent";
import { Suspense } from "react";
import RouteProgressBar from "@/components/ui/RouteProgressBar";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 10 * 60 * 1000,
  });

  const settings = settingsData?.data?.settings;

  useEffect(() => {
    if (settings) {
      try {
        localStorage.setItem("cached_site_settings", JSON.stringify(settings));
      } catch (e) {}

      if (settings.favicon) {
        const faviconSelectors = [
          "link[rel='shortcut icon']",
          "link[rel='icon'][type='image/x-icon']",
          "link[rel='icon'][type='image/png']",
          "link[rel='icon']",
          "link[rel='apple-touch-icon']"
        ];
        faviconSelectors.forEach((selector) => {
          const links = document.querySelectorAll(selector);
          links.forEach((link) => {
            (link as HTMLLinkElement).href = settings.favicon;
          });
        });
      }
      if (settings.siteName) {
        document.title = settings.siteName + (settings.tagline ? ` | ${settings.tagline}` : ' | Premium Namkeen & Snacks');
      }
    }
  }, [settings]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteProgressBar />
      </Suspense>
      <Header />
      <main id="main-content" className="flex-1 relative">{children}</main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </>
  );
}
