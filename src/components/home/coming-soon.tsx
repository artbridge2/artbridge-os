export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="pt-6">
      <h1 className="text-[26px] font-bold text-[#12181f]">{title}</h1>
      <p className="mt-2 text-[14px] text-[#8a909a]">
        Ez a modul még nincs kész — hamarosan érkezik.
      </p>
    </div>
  );
}
