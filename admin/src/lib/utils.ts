import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}


export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

export function generateWhatsAppUrl(message: string, phone?: string): string {
  const number = phone || WHATSAPP_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23fef3c7'/%3E%3Ctext x='200' y='200' text-anchor='middle' dominant-baseline='central' font-size='48' fill='%23d97706'%3EProduct%3C/text%3E%3Ctext x='200' y='260' text-anchor='middle' dominant-baseline='central' font-size='48' fill='%23d97706'%3EImage%3C/text%3E%3C/svg%3E";

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const target = e.currentTarget;
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE;
  }
}

export function getImageUrl(path: string | undefined): string {
  if (!path) return PLACEHOLDER_IMAGE;
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (typeof window !== "undefined") {
      const currentHost = window.location.hostname;
      if (currentHost !== "localhost" && currentHost !== "127.0.0.1" && path.includes("localhost:5001")) {
        const relativePath = path.replace(/https?:\/\/localhost:5001/, "");
        return `${window.location.protocol}//${window.location.host}${relativePath}`;
      }
    }
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (
    normalizedPath.startsWith("/uploads") ||
    normalizedPath.startsWith("/banners") ||
    normalizedPath.startsWith("/gallery") ||
    normalizedPath.startsWith("/products") ||
    normalizedPath.startsWith("/blogs") ||
    normalizedPath.startsWith("/recipes")
  ) {
    const envApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
    const baseUrl = envApi.replace(/\/api$/, "");

    if (typeof window !== "undefined") {
      const currentHost = window.location.hostname;
      if (currentHost !== "localhost" && currentHost !== "127.0.0.1" && baseUrl.includes("localhost")) {
        return `${window.location.protocol}//${window.location.host}${normalizedPath}`;
      }
    }

    return `${baseUrl}${normalizedPath}`;
  }

  return normalizedPath;
}

export const DEFAULT_LOGO_IMAGE = "/uploads/logo.png";

export function getLogoUrl(path?: string): string {
  if (path && path.trim() !== "" && path !== PLACEHOLDER_IMAGE) {
    const resolved = getImageUrl(path);
    if (resolved && resolved !== PLACEHOLDER_IMAGE) {
      return resolved;
    }
  }
  return getImageUrl(DEFAULT_LOGO_IMAGE);
}
