/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Not valid in Next.js
      },
    ],
    unoptimized: true, // allows any image source (disables built-in Image Optimization)
  },
};

export default nextConfig;
