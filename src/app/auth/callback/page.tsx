import { AuthCallback } from "./callback-client";

// Recovery/magic-link tokens arrive in the URL hash, which only the client
// can read — this page has no real per-request server data, so Next.js was
// happy to statically prerender it. That's actively harmful here: a cached
// prerendered shell can keep serving an OLD build's JS bundle to real users
// long after a fix ships (confirmed live — Vercel was serving an 8-minute-
// stale cached copy that still ran the previous, broken client logic).
export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return <AuthCallback />;
}
