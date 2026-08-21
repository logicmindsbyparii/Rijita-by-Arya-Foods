export function formatPrice(price: number): string {
  const amount = Number.isFinite(price) ? price : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

export function generateWhatsAppUrl(message: string, phone?: string): string {
  const rawNumber = phone || WHATSAPP_NUMBER;
  const number = rawNumber.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23fef3c7'/%3E%3Ctext x='200' y='200' text-anchor='middle' dominant-baseline='central' font-size='48' fill='%23d97706'%3EProduct%3C/text%3E%3Ctext x='200' y='260' text-anchor='middle' dominant-baseline='central' font-size='48' fill='%23d97706'%3EImage%3C/text%3E%3C/svg%3E";

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const target = e.currentTarget;
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE;
  }
}

export function getImageUrl(path: string | undefined): string {
  if (!path) return PLACEHOLDER_IMAGE;
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;

  const isProd = process.env.NODE_ENV === "production";
  const defaultBackend = isProd ? "https://rijita-by-arya-foods.onrender.com" : "http://localhost:5001";

  let backendUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl || backendUrl === "/api" || backendUrl.startsWith("/")) {
    backendUrl = defaultBackend;
  } else {
    backendUrl = backendUrl.replace(/\/api$/, "");
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (isProd && path.includes("localhost:5001")) {
      return path.replace(/https?:\/\/localhost:5001/, defaultBackend);
    }
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (
    normalizedPath.startsWith("/uploads") ||
    normalizedPath.startsWith("/banners") ||
    normalizedPath.startsWith("/gallery") ||
    normalizedPath.startsWith("/products") ||
    normalizedPath.startsWith("/blogs") ||
    normalizedPath.startsWith("/recipes")
  ) {
    return `${backendUrl}${normalizedPath}`;
  }

  return normalizedPath;
}

export const DEFAULT_LOGO_IMAGE = "";

export function getLogoUrl(path?: string, updatedAt?: string | Date): string | null {
  if (path && path.trim() !== "" && path !== PLACEHOLDER_IMAGE && path !== "/uploads/logo.png") {
    const resolved = getImageUrl(path);
    if (resolved && resolved !== PLACEHOLDER_IMAGE) {
      if (updatedAt) {
        const time = new Date(updatedAt).getTime();
        return `${resolved}?v=${time}`;
      }
      return resolved;
    }
  }
  return null;
}
