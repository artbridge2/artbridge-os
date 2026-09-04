import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for use in Server Components, Server Actions
 * and Route Handlers. Writing cookies from a Server Component is a no-op
 * (Next.js only allows it in Actions/Route Handlers) — the proxy takes care
 * of refreshing the session cookie on every request either way.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component — the proxy refreshes the
            // session instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}
