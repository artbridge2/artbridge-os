"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/actions/auth";
import { ROLE_LABELS, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/inbox", label: "Inbox" },
  { href: "/tasks", label: "Tasks" },
  { href: "/planning", label: "Planning" },
];

export function Nav({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight">Artbridge OS</span>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className={cn(
              "text-sm",
              pathname.startsWith("/settings")
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {ROLE_LABELS[profile.role]}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-muted-foreground hover:text-foreground"
              title="Kijelentkezés"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
