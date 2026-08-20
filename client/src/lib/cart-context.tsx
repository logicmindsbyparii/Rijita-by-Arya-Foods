"use client";

import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useMemo, ReactNode } from "react";
import toast from "react-hot-toast";
import { CartItem, Product, Variant } from "@/types";
import { productApi } from "@/lib/api";

interface CartState { items: CartItem[] }

type CartAction =
  | { type: "ADD_ITEM"; payload: { product: Product; variant: Variant; quantity: number } }
  | { type: "REMOVE_ITEM"; payload: { productId: string; variantId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; variantId: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] };

interface CartContextType {
  items: CartItem[]; itemCount: number; subtotal: number;
  addItem: (product: Product, variant: Variant, quantity?: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void; cartReady: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Stable identity for a cart line. Variants in this catalogue have no `_id`
 * (MongoDB does not generate one for embedded array docs and the admin form
 * never sends one), so the always-present `sku` is the reliable key — with
 * `_id` preferred when it exists (legacy carts).
 */
export function variantKey(variant: { _id?: string; sku?: string }): string {
  return variant._id || variant.sku || "";
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { product, variant, quantity } = action.payload;
      const i = state.items.findIndex((item) => item.product._id === product._id && variantKey(item.variant) === variantKey(variant));
      // Cap the merged total at what's actually in stock. The product page caps
      // each *individual* add, but nothing capped the running total — adding a
      // full-stock quantity twice put more in the cart than exists, and the
      // shortfall only surfaced as a 409 at Place Order, after the customer had
      // filled in the whole address form.
      const stockCap = typeof variant.stock === "number" && variant.stock > 0 ? variant.stock : Infinity;
      if (i > -1) {
        const items = [...state.items];
        items[i] = { ...items[i], quantity: Math.min(items[i].quantity + quantity, stockCap) };
        return { items };
      }
      return { items: [...state.items, { product, variant, quantity: Math.min(quantity, stockCap), notes: "" }] };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((item) => !(item.product._id === action.payload.productId && variantKey(item.variant) === action.payload.variantId)) };
    case "UPDATE_QUANTITY":
      return { items: state.items.map((item) => item.product._id === action.payload.productId && variantKey(item.variant) === action.payload.variantId ? { ...item, quantity: Math.max(1, action.payload.quantity) } : item) };
    case "CLEAR_CART": return { items: [] };
    case "LOAD_CART": return { items: action.payload };
    default: return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [cartReady, setCartReady] = useState(false);

  const { itemCount, subtotal } = useMemo(() => ({
    itemCount: state.items.reduce((s, i) => s + i.quantity, 0),
    subtotal: state.items.reduce((s, i) => s + i.variant.sellingPrice * i.quantity, 0),
  }), [state.items]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rijita-cart");
      if (saved) {
        const p = JSON.parse(saved);
        // Variants have no `_id` in this catalogue — validate against sku too,
        // otherwise a perfectly valid saved cart is discarded as "invalid".
        if (Array.isArray(p) && p.every(item => item?.product?._id && (item?.variant?._id || item?.variant?.sku) && typeof item?.quantity === 'number')) {
          dispatch({ type: "LOAD_CART", payload: p });
        } else {
          console.warn("Invalid cart data schema in local storage. Clearing cart.");
          localStorage.removeItem("rijita-cart");
        }
      }
    } catch (err) {
      console.error("Failed to parse cart data", err);
      localStorage.removeItem("rijita-cart");
    }
    setCartReady(true);
  }, []);

  // Guarded on cartReady (not a ref flipped synchronously in the load effect above) so this
  // never fires with the pre-load empty state — that race clobbered a just-loaded cart with "[]"
  // before LOAD_CART's dispatch had landed, since both updates ship in the same render either way.
  useEffect(() => {
    if (cartReady) {
      localStorage.setItem("rijita-cart", JSON.stringify(state.items));
    }
  }, [state.items, cartReady]);

  // Re-check the saved cart against the live catalogue, once, after it loads.
  //
  // Every cart line is a *snapshot* of the product and variant taken at "Add to
  // Cart" and then kept in localStorage indefinitely — carts survive for weeks.
  // Nothing refreshed it, so a price change left the customer looking at the old
  // price all the way through checkout while the server (which reads the
  // database at order time) charged the new one. Stock was equally stale: the
  // "can't add more" guards compare against the snapshotted `stock`, and a
  // product that had since sold out or been unpublished only failed at Place
  // Order, after the address form was filled in.
  //
  // Failures here are deliberately silent — this is a best-effort refresh, and a
  // flaky network must never empty somebody's cart.
  const revalidated = useRef(false);
  useEffect(() => {
    if (!cartReady || state.items.length === 0 || revalidated.current) return;
    revalidated.current = true;

    let cancelled = false;
    (async () => {
      const ids = Array.from(new Set(state.items.map((i) => i.product._id)));
      const fetched = await Promise.all(
        ids.map((id) =>
          productApi
            .getProductById(id)
            .then((res: any) => [id, res?.data?.product ?? null] as const)
            .catch(() => [id, null] as const)
        )
      );
      if (cancelled) return;

      // A product we couldn't fetch at all (offline, 500) is left untouched
      // rather than dropped; only an explicit 404/inactive answer removes a line.
      const byId = new Map(fetched);
      if (fetched.every(([, p]) => p === null)) return;

      const removed: string[] = [];
      const repriced: string[] = [];
      const reduced: string[] = [];

      const next = state.items.flatMap((item) => {
        const fresh = byId.get(item.product._id);
        if (fresh === undefined) return [item];
        if (fresh === null || fresh.isActive === false) {
          removed.push(item.product.name);
          return [];
        }
        const freshVariant = (fresh.variants ?? []).find(
          (v: Variant) => variantKey(v) === variantKey(item.variant)
        );
        if (!freshVariant || freshVariant.isActive === false || (freshVariant.stock ?? 0) <= 0) {
          removed.push(`${item.product.name} (${item.variant.weight ?? ""})`.trim());
          return [];
        }
        if (freshVariant.sellingPrice !== item.variant.sellingPrice) {
          repriced.push(item.product.name);
        }
        const quantity = Math.min(item.quantity, freshVariant.stock);
        if (quantity < item.quantity) reduced.push(item.product.name);
        return [{ ...item, product: fresh, variant: freshVariant, quantity }];
      });

      if (removed.length === 0 && repriced.length === 0 && reduced.length === 0) return;

      dispatch({ type: "LOAD_CART", payload: next });
      if (removed.length) toast.error(`No longer available: ${removed.join(", ")}`);
      if (reduced.length) toast(`Quantity reduced to available stock: ${reduced.join(", ")}`);
      if (repriced.length) toast(`Price updated for ${repriced.join(", ")}`);
    })();

    return () => {
      cancelled = true;
    };
    // Runs once per mount, gated by the ref — deliberately not re-run on item edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartReady]);

  const value = useMemo(() => ({
    items: state.items, itemCount, subtotal,
    addItem: (product: Product, variant: Variant, quantity = 1) => dispatch({ type: "ADD_ITEM", payload: { product, variant, quantity } }),
    removeItem: (productId: string, variantId: string) => dispatch({ type: "REMOVE_ITEM", payload: { productId, variantId } }),
    updateQuantity: (productId: string, variantId: string, quantity: number) => dispatch({ type: "UPDATE_QUANTITY", payload: { productId, variantId, quantity } }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }), cartReady,
  }), [state.items, itemCount, subtotal, cartReady]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) throw new Error("useCart must be used within a CartProvider");
  return context;
}
