"use client";

import { useActionState } from "react";
import { requestPasswordReset, type RequestResetState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<RequestResetState, FormData>(
    requestPasswordReset,
    undefined
  );

  if (state?.sent) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium">Elküldtük a jelszó-visszaállító linket.</p>
        <p className="text-sm text-muted-foreground">
          Nézd meg az email fiókod, és kattints a linkre.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email cím</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="nev@artbridge.hu"
          autoFocus
          required
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Küldés..." : "Visszaállító link küldése"}
      </Button>
    </form>
  );
}
