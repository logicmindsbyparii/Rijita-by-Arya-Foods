import { describe, it, expect, beforeEach } from "vitest";
import {
  getDiscountAmount,
  toStoredCoupon,
  readStoredCoupon,
  writeStoredCoupon,
  clearStoredCoupon,
  COUPON_STORAGE_KEY,
  type AppliedCoupon,
} from "@/lib/coupons";

const percent = (over: Partial<AppliedCoupon> = {}): AppliedCoupon => ({
  code: "SAVE50",
  type: "percentage",
  value: 50,
  minOrderAmount: 0,
  ...over,
});

const fixed = (over: Partial<AppliedCoupon> = {}): AppliedCoupon => ({
  code: "FLAT100",
  type: "fixed",
  value: 100,
  minOrderAmount: 0,
  ...over,
});

describe("getDiscountAmount", () => {
  it("applies a percentage discount", () => {
    expect(getDiscountAmount(1000, percent())).toBe(500);
  });

  it("applies a fixed discount", () => {
    expect(getDiscountAmount(1000, fixed())).toBe(100);
  });

  it("recomputes against the current subtotal rather than the one at apply time", () => {
    const coupon = percent();
    // The regression this guards: a 50% coupon applied to a ₹1000 cart must be
    // worth ₹100 once the cart drops to ₹200 — not the original ₹500.
    expect(getDiscountAmount(1000, coupon)).toBe(500);
    expect(getDiscountAmount(200, coupon)).toBe(100);
  });

  it("respects maxDiscount", () => {
    expect(getDiscountAmount(1000, percent({ maxDiscount: 150 }))).toBe(150);
  });

  it("returns 0 below minOrderAmount", () => {
    const coupon = percent({ minOrderAmount: 500 });
    expect(getDiscountAmount(499, coupon)).toBe(0);
    expect(getDiscountAmount(500, coupon)).toBe(250);
  });

  it("never discounts more than the cart is worth", () => {
    expect(getDiscountAmount(50, fixed({ value: 100 }))).toBe(50);
  });

  it("returns 0 for an empty or invalid subtotal", () => {
    expect(getDiscountAmount(0, percent())).toBe(0);
    expect(getDiscountAmount(-10, percent())).toBe(0);
    expect(getDiscountAmount(NaN, percent())).toBe(0);
  });

  it("never returns a negative discount", () => {
    expect(getDiscountAmount(1000, fixed({ value: -100 }))).toBe(0);
  });
});

describe("toStoredCoupon", () => {
  it("keeps only the fields needed to re-derive the discount", () => {
    expect(toStoredCoupon(percent({ maxDiscount: 200, minOrderAmount: 300, description: "x" }))).toEqual({
      code: "SAVE50",
      type: "percentage",
      value: 50,
      maxDiscount: 200,
      minOrderAmount: 300,
    });
  });
});

describe("coupon persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a coupon through storage", () => {
    // The cart page, the cart drawer and checkout each reached for
    // localStorage themselves and drifted apart: the cart wrote a coupon it
    // never read back, and the drawer did neither, so the three surfaces
    // quoted different totals for the same cart. They all go through these
    // helpers now.
    const coupon = percent({ maxDiscount: 200, minOrderAmount: 300 });
    writeStoredCoupon(coupon);
    expect(readStoredCoupon()).toEqual({
      code: "SAVE50",
      type: "percentage",
      value: 50,
      maxDiscount: 200,
      minOrderAmount: 300,
    });
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredCoupon()).toBeNull();
  });

  it("clears a stored coupon", () => {
    writeStoredCoupon(fixed());
    clearStoredCoupon();
    expect(readStoredCoupon()).toBeNull();
  });

  it("drops a stored blob that can no longer be re-priced", () => {
    // A coupon missing type/value cannot feed getDiscountAmount, so restoring
    // it would show a discount of 0 while implying one is applied.
    localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify({ code: "SAVE50" }));
    expect(readStoredCoupon()).toBeNull();
    expect(localStorage.getItem(COUPON_STORAGE_KEY)).toBeNull();
  });

  it("drops a stored coupon with an unknown type", () => {
    localStorage.setItem(
      COUPON_STORAGE_KEY,
      JSON.stringify({ code: "X", type: "bogus", value: 10 })
    );
    expect(readStoredCoupon()).toBeNull();
  });

  it("survives malformed JSON without throwing", () => {
    localStorage.setItem(COUPON_STORAGE_KEY, "{not json");
    expect(readStoredCoupon()).toBeNull();
  });

  it("defaults a missing minOrderAmount to 0 so the coupon still applies", () => {
    localStorage.setItem(
      COUPON_STORAGE_KEY,
      JSON.stringify({ code: "SAVE50", type: "percentage", value: 50 })
    );
    const restored = readStoredCoupon();
    expect(restored?.minOrderAmount).toBe(0);
    expect(getDiscountAmount(1000, restored!)).toBe(500);
  });

  it("restores a percentage coupon that re-prices against the new subtotal", () => {
    writeStoredCoupon(percent());
    const restored = readStoredCoupon()!;
    expect(getDiscountAmount(1000, restored)).toBe(500);
    expect(getDiscountAmount(200, restored)).toBe(100);
  });
});
