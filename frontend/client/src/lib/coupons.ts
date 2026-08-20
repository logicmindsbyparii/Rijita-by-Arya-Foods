/**
 * Shared coupon maths for the cart page and the cart drawer.
 *
 * The important property is that the discount is *derived* from the current
 * subtotal rather than frozen at the moment the coupon was applied. A
 * percentage coupon stored as a rupee amount silently goes wrong the moment the
 * cart changes: a 50% coupon on a ₹1000 cart stays worth ₹500 even after the
 * cart drops to ₹200, so the customer is shown a total far below what the
 * server will charge. Recomputing also re-applies `minOrderAmount`, so a coupon
 * stops discounting when the cart falls below its threshold.
 */
export interface AppliedCoupon {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  maxDiscount?: number;
  minOrderAmount: number;
  description?: string;
}

export function getDiscountAmount(subtotal: number, coupon: AppliedCoupon): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  if (subtotal < (coupon.minOrderAmount ?? 0)) return 0;
  let discount =
    coupon.type === "percentage" ? (coupon.value / 100) * subtotal : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  // Never discount more than the cart is worth.
  discount = Math.min(discount, subtotal);
  return Math.round(Math.max(0, discount));
}

/** Shape persisted to localStorage so a coupon survives the cart → checkout hop. */
export const COUPON_STORAGE_KEY = "rijita-coupon";

export function toStoredCoupon(coupon: AppliedCoupon) {
  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    maxDiscount: coupon.maxDiscount,
    minOrderAmount: coupon.minOrderAmount,
  };
}

/**
 * Read/write helpers so every coupon surface (cart page, cart drawer, checkout)
 * shares one key and one shape.
 *
 * Each surface used to reach for `localStorage` itself with the key spelled out
 * inline, and they drifted: the cart page wrote the coupon but never read it
 * back (so the discount vanished from the cart while checkout still charged
 * it), and the drawer did neither (so a coupon applied there was lost on the
 * way to checkout). Going through these keeps the three consistent.
 *
 * All three are no-ops when `localStorage` is unavailable — SSR, and Safari
 * private mode, where `setItem` throws.
 */
export function readStoredCoupon(): AppliedCoupon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COUPON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // A stored coupon is only useful if it can still be re-priced, so require
    // the fields getDiscountAmount depends on rather than trusting the blob.
    if (
      !parsed ||
      typeof parsed.code !== "string" ||
      !parsed.code ||
      (parsed.type !== "percentage" && parsed.type !== "fixed") ||
      typeof parsed.value !== "number" ||
      !Number.isFinite(parsed.value)
    ) {
      window.localStorage.removeItem(COUPON_STORAGE_KEY);
      return null;
    }
    return {
      code: parsed.code,
      type: parsed.type,
      value: parsed.value,
      maxDiscount: typeof parsed.maxDiscount === "number" ? parsed.maxDiscount : undefined,
      minOrderAmount: typeof parsed.minOrderAmount === "number" ? parsed.minOrderAmount : 0,
    };
  } catch {
    return null;
  }
}

export function writeStoredCoupon(coupon: AppliedCoupon): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(toStoredCoupon(coupon)));
  } catch {
    /* storage full or blocked — the coupon just won't persist */
  }
}

export function clearStoredCoupon(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COUPON_STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}
