"use client";

import { useActionState } from "react";
import { updatePassword, type UpdatePasswordState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<UpdatePasswordState, FormData>(
    updatePassword,
    undefined
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Új jelszó</Label>
        <Input id="password" name="password" type="password" autoFocus required minLength={8} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Új jelszó mégegyszer</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Mentés..." : "Jelszó mentése"}
      </Button>
    </form>
  );
}
