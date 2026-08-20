import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatPrice, formatDate, generateWhatsAppUrl, getImageUrl, handleImageError, PLACEHOLDER_IMAGE, WHATSAPP_NUMBER, DEFAULT_LOGO_IMAGE, getLogoUrl } from "@shared/utils";

export { formatPrice, formatDate, generateWhatsAppUrl, getImageUrl, handleImageError, PLACEHOLDER_IMAGE, WHATSAPP_NUMBER, DEFAULT_LOGO_IMAGE, getLogoUrl };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
