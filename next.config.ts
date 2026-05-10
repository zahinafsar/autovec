import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@imgly/background-removal-node",
    "onnxruntime-node",
    "sharp",
  ],
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/media/:path*", destination: "/api/media/:path*" },
      ],
    };
  },
};

export default nextConfig;
