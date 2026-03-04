const backendBase = (
  process.env.BACKEND_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8001"
).replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/frontend/:path*",
        destination: `${backendBase}/api/frontend/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
