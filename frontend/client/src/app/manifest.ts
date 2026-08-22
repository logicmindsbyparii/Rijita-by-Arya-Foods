import { MetadataRoute } from 'next'
import { getServerApiBase, fetchServerJson } from "@shared/api";
import { getImageUrl } from "@/lib/utils";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let settings: any = {};
  try {
    const settingsData = await fetchServerJson(`${getServerApiBase()}/settings`);
    settings = settingsData?.data?.settings || {};
  } catch (error) {
    console.error("Failed to fetch settings for manifest:", error);
  }
  
  const siteName = settings.siteName || "RIJITA by Arya Foods";
  const shortName = settings.siteName ? (settings.siteName.split(' ')[0]) : "RIJITA";
  const tagline = settings.tagline || "Premium Quality Jain Namkeen & Traditional Indian Snacks. Order authentic snacks from RIJITA by Arya Foods.";
  
  // Use the logo provided by the user for the PWA app icon
  const appIcon = "/icons/app-icon.png";
  const appIconLarge = "/icons/app-icon.png";

  return {
    name: siteName,
    short_name: shortName,
    description: tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF8F0',
    theme_color: '#f97316',
    orientation: 'portrait-primary',
    lang: 'en-IN',
    dir: 'ltr',
    scope: '/',
    categories: ['food', 'shopping', 'lifestyle'],
    icons: [
      {
        src: appIcon,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: appIconLarge,
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: appIconLarge,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: appIcon,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: appIconLarge,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    shortcuts: [
      {
        name: 'Shop Products',
        short_name: 'Shop',
        description: 'Browse all products',
        url: '/products',
        icons: [{ src: appIcon, sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'View Cart',
        short_name: 'Cart',
        description: 'View shopping cart',
        url: '/cart',
        icons: [{ src: appIcon, sizes: '192x192', type: 'image/png' }]
      }
    ],
    screenshots: [],
    related_applications: []
  }
}
