"use client";

import React, { createContext, useContext, useReducer, useEffect, useState, useMemo, ReactNode } from "react";
import { CartItem, Product, Variant } from "@/types";

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

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { product, variant, quantity } = action.payload;
      const i = state.items.findIndex((item) => item.product._id === product._id && item.variant._id === variant._id);
      if (i > -1) {
        const items = [...state.items]; items[i] = { ...items[i], quantity: items[i].quantity + quantity }; return { items };
      }
      return { items: [...state.items, { product, variant, quantity, notes: "" }] };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((item) => !(item.product._id === action.payload.productId && item.variant._id === action.payload.variantId)) };
    case "UPDATE_QUANTITY":
      return { items: state.items.map((item) => item.product._id === action.payload.productId && item.variant._id === action.payload.variantId ? { ...item, quantity: Math.max(1, action.payload.quantity) } : item) };
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
        if (Array.isArray(p) && p.every(item => item?.product?._id && item?.variant?._id && typeof item?.quantity === 'number')) {
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
