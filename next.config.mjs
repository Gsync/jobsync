/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  devIndicators: false,
  // Nothing uses next/image; unoptimized makes /_next/image 404 before sharp
  images: { unoptimized: true },
  outputFileTracingExcludes: {
    "next-server": ["**/node_modules/sharp/**/*", "**/node_modules/@img/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
