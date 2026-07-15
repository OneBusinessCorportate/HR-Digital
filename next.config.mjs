/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions body size limit for resume/import uploads.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
