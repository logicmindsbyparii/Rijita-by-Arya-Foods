export const getApiBase = () => {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!envUrl || envUrl.includes("localhost:5001") || envUrl.includes("127.0.0.1:5001")) {
      return "/api";
    }
    return envUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
};

export const API_BASE = getApiBase();

export interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

export async function parseResponseBody(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
}

export function extractErrorMessage(data: any, status: number): string {
  if (typeof data?.message === "string" && data.message) return data.message;
  const detail = data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d: any) => (typeof d?.msg === "string" ? d.msg : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join(", ");
  }
  if (status === 0) return "Unable to reach the server. Please check your connection.";
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return "Request failed. Please try again.";
}
