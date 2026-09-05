import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function OpenButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex h-12 w-[121px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#e4e4e4] bg-white text-[13.5px] font-medium text-[#3d4451] hover:bg-[#f9f9f9]"
    >
      Open
      <ArrowRight className="size-3.5" />
    </Link>
  );
}
