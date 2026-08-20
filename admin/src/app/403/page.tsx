import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-cream to-amber-50 p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
          <span className="text-4xl font-bold text-red-500">403</span>
        </div>
        <h1 className="text-3xl font-display font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          You don&apos;t have permission to access this area. This section is restricted to administrators only.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-4 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/admin/login"
            className="px-6 py-4 border rounded-xl font-medium hover:bg-muted transition-colors"
          >
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
