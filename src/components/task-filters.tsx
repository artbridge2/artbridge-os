"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, STATUS_LABELS, type Area, type Profile } from "@/lib/types";

const QUICK_FILTERS: { label: string; value: string }[] = [
  { label: "Mine", value: "me" },
  { label: "Ádám", value: "adam" },
  { label: "Eszter", value: "eszter" },
  { label: "Kurátor", value: "kurator" },
  { label: "All", value: "" },
];

export function TaskFilters({
  profiles,
  areas,
  currentUserId,
}: {
  profiles: Profile[];
  areas: Area[];
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const owner = searchParams.get("owner") ?? "";
  const area = searchParams.get("area") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const overdue = searchParams.get("overdue") === "1";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`/tasks?${params.toString()}`));
  }

  function resolvedOwnerQuickValue() {
    if (!owner) return "";
    if (owner === currentUserId) return "me";
    const p = profiles.find((p) => p.id === owner);
    return p?.role ?? "";
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", search);
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Keresés..."
            className="h-8 w-40"
          />
        </form>

        <select
          value={area}
          onChange={(e) => setParam("area", e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Minden area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Minden status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
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

        <Button
          type="button"
          size="sm"
          variant={overdue ? "default" : "outline"}
          onClick={() => setParam("overdue", overdue ? "" : "1")}
          className={cn(overdue && "bg-red-600 hover:bg-red-600/90")}
        >
          Overdue
        </Button>
      </div>
    </div>
  );
}
