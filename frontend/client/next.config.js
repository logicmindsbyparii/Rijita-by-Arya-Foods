/** @type {import('next').NextConfig} */

/**
 * The browser always talks to the API through the same-origin `/api` rewrite,
 * so NEXT_PUBLIC_API_URL stays "/api" in every deployed environment. That is
 * what keeps the httpOnly refresh cookie (SameSite=Lax, set by the FastAPI
 * backend) first-party — a cross-site XHR straight to the Render host would
 * silently drop it and log the user out on every refresh.
 *
 * The rewrite destination itself needs a real origin, which only server-side
 * code can see: API_ORIGIN (e.g. https://rijita-by-arya-foods.onrender.com).
 * NEXT_PUBLIC_API_URL is still honoured when it is absolute, so existing
 * localhost setups keep working unchanged.
 */
function apiOrigin() {
  for (const raw of [process.env.API_ORIGIN, process.env.NEXT_PUBLIC_API_URL]) {
    if (!raw) continue;
    try {
      return new URL(raw).origin;
    } catch {
      // Relative value (e.g. "/api") — not an origin, keep looking.
    }
  }
  return process.env.NODE_ENV === 'production' ? 'https://rijita-by-arya-foods.onrender.com' : 'http://localhost:5001';
}

/**
 * Uploads are served by the API host. Deriving the image pattern from the same
 * origin the rewrite uses keeps the optimizer and the API in step — if the API
 * is reachable, its images are too.
 */
function apiImagePattern() {
  try {
    const { protocol, hostname, port } = new URL(apiOrigin());
    return [
      {
        protocol: protocol.replace(':', ''),
        hostname,
        ...(port ? { port } : {}),
        pathname: '/uploads/**',
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig = {
  eslint: {
    dirs: ['src'],
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      ...apiImagePattern(),
      {
        protocol: 'https',
        hostname: 'rijita-by-arya-foods.onrender.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  experimental: {},
  async rewrites() {
    const host = apiOrigin();
    return [
      {
        source: '/api/:path*',
        destination: `${host}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${host}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
