import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Variant } from "@/types";
import { getImageUrl as _getImageUrl, DEFAULT_LOGO_IMAGE as _DEFAULT_LOGO_IMAGE } from "@shared/utils";
export { formatPrice, formatDate, generateWhatsAppUrl, getImageUrl, handleImageError, PLACEHOLDER_IMAGE, WHATSAPP_NUMBER, DEFAULT_LOGO_IMAGE } from "@shared/utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pick the variant a product card should price and add to the cart.
 *
 * Every card used to take `variants[0]` unconditionally, so a product whose
 * first pack was sold out or deactivated rendered "Sold Out" — and refused to
 * add to the cart — while its other sizes were in stock and orderable. The
 * price shown could also come from a variant the server rejects at checkout,
 * since `place_order` refuses inactive variants outright.
 *
 * Preference order: sellable (active and in stock) → active → whatever exists,
 * so an all-sold-out product still renders its real price under the overlay.
 *
 * `isActive` is treated as true when absent, matching the server's
 * `variant.get("isActive", True)` for older records that predate the field.
 */
export function getPrimaryVariant(variants?: Variant[]): Variant | undefined {
  if (!variants?.length) return undefined;
  const active = variants.filter((v) => v?.isActive !== false);
  return active.find((v) => (v.stock ?? 0) > 0) ?? active[0] ?? variants[0];
}

export function getLogoUrl(path?: string, updatedAt?: string | Date): string {
  let url: string;
  if (path && path.trim() !== "" && path !== _DEFAULT_LOGO_IMAGE) {
    const resolved = _getImageUrl(path);
    if (resolved && resolved !== _DEFAULT_LOGO_IMAGE) {
      url = resolved;
    } else {
      url = _getImageUrl(_DEFAULT_LOGO_IMAGE);
    }
  } else {
    url = _getImageUrl(_DEFAULT_LOGO_IMAGE);
  }
  if (updatedAt) {
    const v = typeof updatedAt === "string" ? new Date(updatedAt).getTime() : updatedAt.getTime();
    if (!isNaN(v) && v > 0) {
      url += (url.includes("?") ? "&" : "?") + `v=${v}`;
    }
  }
  return url;
}

export function calculateDiscount(mrp: number, sellingPrice: number): number {
  if (!Number.isFinite(mrp) || !Number.isFinite(sellingPrice) || mrp <= 0) return 0;
  // Clamp: when sellingPrice exceeds mrp (a data-entry slip in the admin) the raw
  // formula goes negative and the badge advertises "-15% OFF".
  if (sellingPrice >= mrp) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}




/**
 * Prepend the store's configured WhatsApp message template (a greeting like
 * "Hi, I would like to order from RIJITA.") to an auto-generated order message.
 * No-op when the template is unset.
 */
export function applyWhatsAppTemplate(message: string, template?: string): string {
  const greeting = template?.trim();
  if (!greeting) return message;
  return `${greeting}\n\n${message}`;
}

/**
 * Build a `tel:` href. Display numbers carry spaces and punctuation
 * ("+91 99044 59998"), which are not valid in a tel: URI — some dialers drop
 * everything after the first space. Keeps a leading "+" for the country code.
 */
export function telHref(phone: string): string {
  const trimmed = (phone || "").trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}


