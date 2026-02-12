/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/arena",
  transpilePackages: ["@battle-royale/shared"],
  output: "standalone",
  // Disable image optimization for Docker standalone
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
