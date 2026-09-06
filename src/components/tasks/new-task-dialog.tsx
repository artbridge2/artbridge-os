"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createTask, type TaskFormState } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PRIORITY_LABELS, ROLE_LABELS, type Area, type Profile } from "@/lib/types";

export function NewTaskDialog({
  profiles,
  areas,
  defaultOwnerId,
}: {
  profiles: Profile[];
  areas: Area[];
  defaultOwnerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TaskFormState, FormData>(createTask, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-[#12181f] text-white hover:bg-[#12181f]/90">
            <Plus className="size-4" />
            New task
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="owner_id">Assignee</Label>
              <select
                id="owner_id"
                name="owner_id"
                defaultValue={defaultOwnerId}
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {ROLE_LABELS[p.role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="area_id">Area</Label>
              <select id="area_id" name="area_id" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">—</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                defaultValue="normal"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter className="px-0">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create task"}
            </Button>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
