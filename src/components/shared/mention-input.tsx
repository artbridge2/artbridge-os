"use client";

import { useMemo, useRef, useState } from "react";
import type { Profile } from "@/lib/types";

/** Given final comment text and the profiles picked from the dropdown while composing it, keeps only the picks whose "@Name" text is still actually present — so deleting a mention from the text also drops the notification. */
export function resolveMentions(text: string, picks: { id: string; name: string }[]): string[] {
  const lower = text.toLowerCase();
  return picks.filter((p) => lower.includes(`@${p.name.toLowerCase()}`)).map((p) => p.id);
}

/**
 * "@"-mention text input, shared by every comment/note composer in the app
 * (spec §9). Typing "@" opens a real autocomplete of team members; picking
 * one inserts "@FullName" and records a structured pick — the server action
 * gets real profile ids via `resolveMentions`, not a guess from parsing text.
 */
export function MentionInput({
  value,
  onValueChange,
  picks,
  onPicksChange,
  profiles,
  placeholder,
  disabled,
  onEnter,
  className,
  multiline = false,
  rows,
}: {
  value: string;
  onValueChange: (text: string) => void;
  picks: { id: string; name: string }[];
  onPicksChange: (picks: { id: string; name: string }[]) => void;
  profiles: Profile[];
  placeholder?: string;
  disabled?: boolean;
  /** Enter submits when the dropdown isn't open — only meaningful for the single-line (comment) case; textareas need a real newline. */
  onEnter?: () => void;
  className?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  // The "@query" run immediately before the caret, if any — recomputed from
  // the live caret position on every keystroke rather than tracked in state,
  // so it can never drift out of sync with what's actually on screen.
  function currentQuery(): { query: string; start: number } | null {
    const el = inputRef.current;
    if (!el) return null;
    const caret = el.selectionStart ?? value.length;
    const upToCaret = value.slice(0, caret);
    const at = upToCaret.lastIndexOf("@");
    if (at === -1) return null;
    const query = upToCaret.slice(at + 1);
    if (/\s/.test(query)) return null; // "@" from an earlier, already-finished word
    return { query, start: at };
  }

  const active = open ? currentQuery() : null;
  const matches = useMemo(() => {
    if (!active) return [];
    const q = active.query.toLowerCase();
    return profiles.filter((p) => p.full_name.toLowerCase().includes(q)).slice(0, 6);
  }, [active, profiles]);

  function pick(p: Profile) {
    const ctx = currentQuery();
    if (!ctx) return;
    const before = value.slice(0, ctx.start);
    const after = value.slice(ctx.start + 1 + ctx.query.length);
    const insertion = `@${p.full_name} `;
    onValueChange(before + insertion + after);
    onPicksChange([...picks, { id: p.id, name: p.full_name }]);
    setOpen(false);
    requestAnimationFrame(() => {
      const pos = before.length + insertion.length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (open && matches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => (h - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(matches[highlighted]!);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    if (!multiline && e.key === "Enter") onEnter?.();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onValueChange(e.target.value);
    setOpen(e.target.value.includes("@"));
    setHighlighted(0);
  }

  const dropdown = open && matches.length > 0 && (
    <div className="absolute bottom-full left-0 z-10 mb-1 w-56 overflow-hidden rounded-lg border border-[#eeeeee] bg-white shadow-md">
      {matches.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            pick(p);
          }}
          className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] ${i === highlighted ? "bg-[#f4f4f4]" : ""}`}
        >
          <span className="font-medium text-[#12181f]">{p.full_name}</span>
        </button>
      ))}
    </div>
  );

  if (multiline) {
    return (
      <div className="relative">
        <textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={
            className ??
            "flex field-sizing-content min-h-16 w-full resize-none rounded-lg border-0 bg-transparent px-1 py-2 text-base shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          }
        />
        {dropdown}
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className ?? "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-[13.5px]"}
      />
      {dropdown}
    </div>
  );
}
