"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWorkspaceSettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkspaceSettings } from "@/lib/queries-settings";

export function GeneralSettingsForm({ settings }: { settings: WorkspaceSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [pending, startTransition] = useTransition();
  const dirty = form.company_name !== settings.company_name || form.locale !== settings.locale || form.timezone !== settings.timezone;

  function save() {
    startTransition(async () => {
      await updateWorkspaceSettings({ company_name: form.company_name, locale: form.locale, timezone: form.timezone });
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Company / workspace name</Label>
          <Input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Locale</Label>
            <select
              value={form.locale}
              onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              <option value="hu">Magyar</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} />
          </div>
        </div>
      </div>
      <Button size="sm" className="mt-3" disabled={!dirty || pending} onClick={save}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
