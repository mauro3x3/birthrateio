/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep Prisma out of the bundle (moved out of `experimental` in Next 15).
  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  eslint: {
    // Don't fail production builds on lint; CI runs `next lint` separately.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
