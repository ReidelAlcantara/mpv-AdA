import type { NextConfig } from "next";

// ADA_DESKTOP=1 → export estático para la app de escritorio (Electron).
// Sin esa variable, el comportamiento queda intacto (standalone + preview web).
const isDesktopExport = process.env.ADA_DESKTOP === "1";

const nextConfig: NextConfig = {
  output: isDesktopExport ? "export" : "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "localhost"],
};

export default nextConfig;
