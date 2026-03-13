import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@atrium/shared"],
  allowedDevOrigins: ["*"],
};

export default nextConfig;
