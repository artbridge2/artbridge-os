"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, PRIORITY_LABELS, type Profile } from "@/lib/types";

const QUICK_FILTERS: { label: string; value: string }[] = [
  { label: "Mine", value: "me" },
  { label: "Ádám", value: "adam" },
  { label: "Eszter", value: "eszter" },
  { label: "Kurátor", value: "kurator" },
  { label: "All", value: "" },
];

export function InboxFilters({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const owner = searchParams.get("owner") ?? "";
  const category = searchParams.get("category") ?? "";
  const priority = searchParams.get("priority") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`/communication?${params.toString()}`));
  }

  function resolvedOwnerQuickValue() {
    if (!owner) return "";
    if (owner === currentUserId) return "me";
    return profiles.find((p) => p.id === owner)?.role ?? "";
  }

  function selectQuickOwner(value: string) {
    if (!value) return setParam("owner", "");
    if (value === "me") return setParam("owner", currentUserId);
    const p = profiles.find((p) => p.role === value);
    setParam("owner", p?.id ?? "");
  }

  const activeQuick = resolvedOwnerQuickValue();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK_FILTERS.map((f) => (
          <Button
            key={f.label}
            type="button"
            size="sm"
            variant={activeQuick === f.value ? "default" : "outline"}
            onClick={() => selectQuickOwner(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => setParam("category", e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Minden category</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setParam("priority", e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Minden priority</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
