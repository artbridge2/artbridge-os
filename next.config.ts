import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Vercel's build cache was serving a stale Settings page render after a
    // source change with no other symptom (fresh, non-cached HTTP response,
    // correct routes/build log) — disabling Turbopack's own on-disk build
    // cache (new default as of Next 16.3) forces every deploy to compile
    // from scratch instead of trusting a possibly-stale .next/cache.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
