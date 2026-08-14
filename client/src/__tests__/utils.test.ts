import { describe, it, expect } from "vitest";
import {
  cn,
  formatPrice,
  formatDate,
  calculateDiscount,
  generateWhatsAppUrl,
  WHATSAPP_NUMBER,
  PLACEHOLDER_IMAGE,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatPrice", () => {
  it("formats number as INR currency", () => {
    expect(formatPrice(999)).toBe("₹999");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("₹0");
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2024-01-15");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date("2024-06-01"));
    expect(result).toContain("1");
    expect(result).toContain("2024");
  });
});

describe("calculateDiscount", () => {
  it("calculates percentage discount", () => {
    expect(calculateDiscount(1000, 800)).toBe(20);
  });

  it("returns 0 when mrp is 0", () => {
    expect(calculateDiscount(0, 0)).toBe(0);
  });

  it("returns 0 for negative mrp", () => {
    expect(calculateDiscount(-100, 50)).toBe(0);
  });
});

describe("generateWhatsAppUrl", () => {
  it("builds URL with default number", () => {
    const url = generateWhatsAppUrl("Hello");
    expect(url).toContain(WHATSAPP_NUMBER);
    expect(url).toContain("Hello");
  });
});

describe("constants", () => {
  it("WHATSAPP_NUMBER is a string", () => {
    expect(typeof WHATSAPP_NUMBER).toBe("string");
  });

  it("PLACEHOLDER_IMAGE is a data URI", () => {
    expect(PLACEHOLDER_IMAGE).toContain("data:image/svg+xml");
  });
});
