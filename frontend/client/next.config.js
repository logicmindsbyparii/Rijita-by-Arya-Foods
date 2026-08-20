/** @type {import('next').NextConfig} */

/**
 * Uploads are served by the API host. In dev that's localhost:5001; in any
 * other environment it's whatever NEXT_PUBLIC_API_URL points at. Deriving the
 * pattern from the same env var the data layer uses keeps the image optimizer
 * and the API in step — if the API is reachable, its images are too.
 */
function apiImagePattern() {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return [];
  try {
    const { protocol, hostname, port } = new URL(raw);
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
    const raw = process.env.NEXT_PUBLIC_API_URL;
    let host = 'http://localhost:5001';
    if (raw) {
      try {
        const url = new URL(raw);
        host = url.origin;
      } catch {
        // leave default
      }
    }
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
