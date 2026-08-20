import { AuthProvider } from "@/lib/admin/auth-context";
import { AdminQueryProvider } from "@/lib/admin/providers";
import "./globals.css";
import "./tokens.css";

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminQueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </AdminQueryProvider>
  );
}
