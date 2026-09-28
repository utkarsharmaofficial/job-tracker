import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@googleapis/gmail", "html-to-text"],
};

export default nextConfig;
