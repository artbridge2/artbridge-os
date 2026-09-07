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
 * Parses the hash directly and calls setSession() explicitly rather than
 * relying on the client's automatic detectSessionInUrl/onAuthStateChange —
 * confirmed live that the automatic path never fired here.
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
    const next = searchParams.get("next") || "/";
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const type = hash.get("type");

    if (!accessToken || !refreshToken) {
      setFailed(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (error) {
        setFailed(true);
        return;
      }
      router.replace(type === "recovery" ? "/reset-password" : next);
    });
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-foreground">
        {failed ? "This link is invalid or has expired — request a new one from the login page." : "Signing you in…"}
      </p>
    </div>
  );
}
