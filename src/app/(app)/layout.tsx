import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/dal";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
