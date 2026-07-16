import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone + local prebuilt on macOS pulled wrong libsql native binaries
  // for Vercel (linux). Prefer remote Linux builds; keep package externalized.
  serverExternalPackages: ["@libsql/client", "@libsql/hrana-client", "libsql"],
  transpilePackages: ["@mingli/auth"],
};

export default nextConfig;
