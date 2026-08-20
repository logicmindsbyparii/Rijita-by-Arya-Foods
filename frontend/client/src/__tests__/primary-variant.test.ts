import { describe, it, expect } from "vitest";
import { getPrimaryVariant } from "@/lib/utils";
import type { Variant } from "@/types";

const variant = (over: Partial<Variant> = {}): Variant => ({
  weight: "500 g",
  weightValue: 500,
  weightUnit: "g",
  mrp: 200,
  sellingPrice: 180,
  discount: 10,
  stock: 5,
  sku: "SKU-500",
  isActive: true,
  ...over,
});

describe("getPrimaryVariant", () => {
  it("returns undefined for a product with no variants", () => {
    expect(getPrimaryVariant(undefined)).toBeUndefined();
    expect(getPrimaryVariant([])).toBeUndefined();
  });

  it("returns the first variant when it is sellable", () => {
    const first = variant({ sku: "A" });
    const second = variant({ sku: "B" });
    expect(getPrimaryVariant([first, second])?.sku).toBe("A");
  });

  it("skips a sold-out first variant for one that is in stock", () => {
    // The regression this guards: cards hardcoded variants[0], so a product
    // whose first pack was sold out rendered "Sold Out" and refused to add to
    // the cart even though a larger pack was available.
    const soldOut = variant({ sku: "A", stock: 0 });
    const inStock = variant({ sku: "B", stock: 3 });
    expect(getPrimaryVariant([soldOut, inStock])?.sku).toBe("B");
  });

  it("skips a deactivated variant even when it has stock", () => {
    // place_order rejects inactive variants, so pricing a card off one shows a
    // price the server will not honour.
    const inactive = variant({ sku: "A", isActive: false, stock: 99 });
    const active = variant({ sku: "B", stock: 1 });
    expect(getPrimaryVariant([inactive, active])?.sku).toBe("B");
  });

  it("prefers a sellable variant over an earlier active but sold-out one", () => {
    const activeSoldOut = variant({ sku: "A", stock: 0 });
    const inactiveInStock = variant({ sku: "B", isActive: false, stock: 10 });
    const sellable = variant({ sku: "C", stock: 2 });
    expect(getPrimaryVariant([activeSoldOut, inactiveInStock, sellable])?.sku).toBe("C");
  });

  it("falls back to the first active variant when everything is sold out", () => {
    // Still needs a variant so the card can show a real price under the
    // "Sold Out" overlay rather than ₹0.
    const a = variant({ sku: "A", stock: 0 });
    const b = variant({ sku: "B", stock: 0 });
    expect(getPrimaryVariant([a, b])?.sku).toBe("A");
  });

  it("falls back to the first variant when every variant is inactive", () => {
    const a = variant({ sku: "A", isActive: false });
    const b = variant({ sku: "B", isActive: false });
    expect(getPrimaryVariant([a, b])?.sku).toBe("A");
  });

  it("treats a missing isActive as active, matching the server default", () => {
    // Older records predate the field; the server reads it as
    // variant.get("isActive", True).
    const legacy = { ...variant({ sku: "A" }) } as Partial<Variant>;
    delete legacy.isActive;
    expect(getPrimaryVariant([legacy as Variant])?.sku).toBe("A");
  });

  it("treats a missing stock as unsellable but still selectable", () => {
    const noStock = { ...variant({ sku: "A" }) } as Partial<Variant>;
    delete noStock.stock;
    const inStock = variant({ sku: "B", stock: 4 });
    expect(getPrimaryVariant([noStock as Variant, inStock])?.sku).toBe("B");
    expect(getPrimaryVariant([noStock as Variant])?.sku).toBe("A");
  });
});
