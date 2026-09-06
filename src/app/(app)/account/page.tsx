import { getCurrentProfile } from "@/lib/dal";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/types";

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  const initial = profile.full_name.charAt(0).toUpperCase();

  return (
    <div className="max-w-md space-y-6 pt-6">
      <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">My profile</h1>

      <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#f6cfc7] text-[20px] font-semibold text-[#8a3b2b]">
            {initial}
          </span>
          <div>
            <p className="text-[16px] font-semibold text-[#12181f]">{profile.full_name}</p>
            <p className="text-[13.5px] text-[#8a909a]">{profile.email}</p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-[#f2f2f2] border-t border-[#f2f2f2] pt-2">
          <div className="flex items-center justify-between py-2">
            <p className="text-[13.5px] text-[#5a616c]">Role</p>
            <p className="text-[13.5px] font-medium text-[#12181f]">{ROLE_LABELS[profile.role]}</p>
          </div>
          <div className="flex items-center justify-between py-2">
            <p className="text-[13.5px] text-[#5a616c]">Email</p>
            <p className="text-[13.5px] font-medium text-[#12181f]">{profile.email}</p>
          </div>
        </div>

        <p className="mt-3 text-[12.5px] text-[#9aa0a8]">
          Role and access are managed by an Admin under Settings → Team & Permissions.
        </p>
      </div>

      <form action={signOut}>
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </div>
  );
}
