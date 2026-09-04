import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed "middleware" to "proxy", but some platform build
// pipelines (Vercel included, as of this writing) still specifically look
// for the middleware.ts filename to wire up the edge/node function. Keeping
// this filename with a `proxy` export satisfies both the new framework
// convention and older tooling that hasn't caught up yet.
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const middleware = proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
