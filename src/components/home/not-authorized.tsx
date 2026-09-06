export function NotAuthorized({ title }: { title: string }) {
  return (
    <div className="pt-6">
      <h1 className="text-[26px] font-bold text-[#12181f]">{title}</h1>
      <p className="mt-2 text-[14px] text-[#8a909a]">
        You don&apos;t have access to this module. Ask an admin to grant it in Settings → Team &amp; Permissions.
      </p>
    </div>
  );
}
