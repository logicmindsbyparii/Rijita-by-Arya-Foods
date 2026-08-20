import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "@/lib/cart-context";
import { Product, Variant } from "@/types";
import React from "react";

const mockVariant: Variant = {
  _id: "v1",
  weight: "500g",
  weightValue: 500,
  weightUnit: "g",
  mrp: 500,
  sellingPrice: 400,
  discount: 20,
  stock: 10,
  sku: "P-500",
  isActive: true,
};

const mockProduct: Product = {
  _id: "p1",
  name: "Test Product",
  slug: "test-product",
  description: "A test product",
  category: "cat1",
  variants: [mockVariant],
  images: [],
  tags: [],
  gst: 5,
  hsn: "1234",
  isActive: true,
  isFeatured: false,
  isBestSeller: false,
  isNewArrival: false,
  unit: "kg",
  metaTitle: "Test",
  metaDescription: "Test",
  metaKeywords: [],
  totalSold: 0,
  averageRating: 0,
  reviewCount: 0,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

describe("cart reducer via useCart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with empty cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.subtotal).toBe(0);
  });

  it("adds item to cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(mockProduct, mockVariant, 2);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.subtotal).toBe(800);
  });

  it("increments quantity when same item is added again", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(mockProduct, mockVariant, 1);
    });
    act(() => {
      result.current.addItem(mockProduct, mockVariant, 3);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.itemCount).toBe(4);
    expect(result.current.subtotal).toBe(1600);
  });

  it("treats variants without _id as distinct lines (keyed by sku)", () => {
    // Catalogue variants have no _id (Mongo doesn't generate one for embedded
    // docs; the admin form never sends one) — so identity must fall back to sku.
    const { _id, ...variantWithoutId } = mockVariant;
    const variantB = { ...mockVariant, sku: "P-1000", weight: "1kg", weightValue: 1000, sellingPrice: 700 };
    const variantBNoId = { ...variantB, _id: undefined };
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(mockProduct, variantWithoutId as Variant, 1);
    });
    act(() => {
      result.current.addItem(mockProduct, variantBNoId, 2);
    });
    // Two distinct variants of the same product must stay separate lines
    expect(result.current.items).toHaveLength(2);
    expect(result.current.itemCount).toBe(3);
    expect(result.current.subtotal).toBe(400 + 700 * 2);

    // Removing one variant must not remove the other
    act(() => {
      result.current.removeItem("p1", "P-500");
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].variant.sku).toBe("P-1000");
  });

  it("removes item", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(mockProduct, mockVariant, 1);
    });
    act(() => {
      result.current.removeItem("p1", "v1");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
  });

  it("updates quantity", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(mockProduct, mockVariant, 1);
    });
    act(() => {
      result.current.updateQuantity("p1", "v1", 5);
    });
    expect(result.current.itemCount).toBe(5);
    expect(result.current.subtotal).toBe(2000);
  });

  it("clamps quantity to minimum 1", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(mockProduct, mockVariant, 3);
    });
    act(() => {
      result.current.updateQuantity("p1", "v1", 0);
    });
    expect(result.current.itemCount).toBe(1);
  });

  it("clears the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(mockProduct, mockVariant, 2);
    });
    act(() => {
      result.current.clearCart();
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.subtotal).toBe(0);
  });
});
