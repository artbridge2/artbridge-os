"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles both Supabase auth-link shapes: a PKCE `?code=` (would need a
 * server exchange) and — what this project's password-reset/magic-link
 * emails actually send — an implicit-flow `#access_token=...&type=recovery`
 * hash fragment. A hash fragment is never sent to the server at all, so a
 * server Route Handler (the previous implementation) could never see it and
 * silently fell through to "invalid link" for every real recovery email.
 * The browser Supabase client's `detectSessionInUrl` (on by default) reads
 * either shape straight from `window.location` on mount and establishes the
 * session client-side; `onAuthStateChange` tells us which happened.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center px-4 text-center"><p className="text-sm text-muted-foreground">Signing you in…</p></div>}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const next = searchParams.get("next") || "/";

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/reset-password");
      } else if (event === "SIGNED_IN") {
        router.replace(next);
      }
    });

    const timeout = setTimeout(() => setFailed(true), 5000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-foreground">
        {failed ? "This link is invalid or has expired — request a new one from the login page." : "Signing you in…"}
      </p>
    </div>
  );
}
