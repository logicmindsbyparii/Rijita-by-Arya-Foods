import { describe, it, expect } from "vitest";
import {
  cn,
  formatPrice,
  formatDate,
  calculateDiscount,
  generateWhatsAppUrl,
  applyWhatsAppTemplate,
  telHref,
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

  it("falls back to zero for non-finite input instead of rendering ₹NaN", () => {
    expect(formatPrice(NaN)).toBe("₹0");
    expect(formatPrice(undefined as unknown as number)).toBe("₹0");
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

  it("returns an empty string rather than 'Invalid Date' for unparseable input", () => {
    expect(formatDate("not-a-date")).toBe("");
    expect(formatDate("")).toBe("");
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

  it("never reports a negative discount when sellingPrice exceeds mrp", () => {
    expect(calculateDiscount(800, 1000)).toBe(0);
    expect(calculateDiscount(800, 800)).toBe(0);
  });
});

describe("generateWhatsAppUrl", () => {
  it("builds URL with default number", () => {
    const url = generateWhatsAppUrl("Hello");
    expect(url).toContain(WHATSAPP_NUMBER);
    expect(url).toContain("Hello");
  });
});

describe("applyWhatsAppTemplate", () => {
  it("prepends the template greeting to the message", () => {
    expect(applyWhatsAppTemplate("*Order #RIJ-1*", "Hi, I would like to order from RIJITA.")).toBe(
      "Hi, I would like to order from RIJITA.\n\n*Order #RIJ-1*"
    );
  });

  it("returns the message unchanged when no template is set", () => {
    const message = "*Order #RIJ-1*";
    expect(applyWhatsAppTemplate(message, "")).toBe(message);
    expect(applyWhatsAppTemplate(message, "   ")).toBe(message);
    expect(applyWhatsAppTemplate(message, undefined)).toBe(message);
  });
});

describe("telHref", () => {
  it("strips spaces and punctuation from a display number", () => {
    expect(telHref("+91 99044 59998")).toBe("tel:+919904459998");
    expect(telHref("(079) 2345-6789")).toBe("tel:07923456789");
  });

  it("keeps a leading plus for country codes", () => {
    expect(telHref("+919904459998")).toBe("tel:+919904459998");
    expect(telHref("9904459998")).toBe("tel:9904459998");
  });

  it("returns an empty href when there are no digits", () => {
    expect(telHref("")).toBe("");
    expect(telHref("   ")).toBe("");
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
