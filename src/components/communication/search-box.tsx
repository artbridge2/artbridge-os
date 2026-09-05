"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) params.set("q", value.trim());
    else params.delete("q");
    startTransition(() => router.push(`/communication?${params.toString()}`));
  }

  return (
    <form onSubmit={submit} className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aa0a8]" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search name, email, order number, ticket content…"
        className="h-9 w-full rounded-lg border border-[#e4e4e4] bg-white pl-9 pr-3 text-[13.5px] text-[#3d4451] placeholder:text-[#9aa0a8]"
      />
    </form>
  );
}
