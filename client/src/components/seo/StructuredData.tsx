"use client";

import { usePathname } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface StructuredDataProps {
  type?: "Organization" | "Product" | "BreadcrumbList" | "FAQPage" | "Article";
  data?: any;
}

/**
 * Injects JSON-LD structured data for SEO.
 * By default renders Organization schema on all pages.
 * Pass type + data for page-specific schemas (Product, BreadcrumbList, etc.)
 */
export default function StructuredData({ type, data }: StructuredDataProps) {
  const pathname = usePathname();

  // Default Organization schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RIJITA by Arya Foods",
    url: BASE_URL,
    logo: `${BASE_URL}/icons/icon-512x512.png`,
    description:
      "Premium quality Jain namkeen and traditional Indian snacks. Authentic taste, pure ingredients, delivered to your doorstep.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Surat",
      addressRegion: "Gujarat",
      addressCountry: "IN",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-9876543210",
      contactType: "customer service",
      availableLanguage: ["en", "hi", "gu"],
    },
    sameAs: [
      "https://www.instagram.com/rijita_byaryafoods",
    ],
  };

  // BreadcrumbList schema
  const breadcrumbSchema = () => {
    const segments = pathname.split("/").filter(Boolean);
    const items = segments.map((segment, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
      item: `${BASE_URL}/${segments.slice(0, index + 1).join("/")}`,
    }));

    // Prepend Home
    items.unshift({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: BASE_URL,
    });

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items,
    };
  };

  // WebSite schema with search
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RIJITA by Arya Foods",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  let schemas = [organizationSchema, websiteSchema, breadcrumbSchema()];

  // Add page-specific schema if provided
  if (type && data) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": type,
      ...data,
    });
  }

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
