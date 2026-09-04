"use client";

import { useActionState } from "react";
import { addArea, type AreaFormState } from "@/actions/areas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddAreaForm() {
  const [state, action, pending] = useActionState<AreaFormState, FormData>(
    addArea,
    undefined
  );

  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <Input name="name" placeholder="Új area neve" required />
        {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Hozzáadás
      </Button>
    </form>
  );
}
