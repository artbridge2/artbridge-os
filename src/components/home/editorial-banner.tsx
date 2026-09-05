import Image from "next/image";
import { playfair } from "@/lib/fonts";

export function EditorialBanner({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="relative h-[212px] w-full overflow-hidden rounded-2xl bg-[#c9b8a4]">
      <div
        className="absolute inset-y-0 right-0 w-[68%]"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 90px)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 90px)",
        }}
      >
        <Image
          src="/banner-photo.png"
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
      </div>
      <div className={`${playfair.className} absolute left-10 top-1/2 -translate-y-1/2 text-[26px] leading-[1.35] text-[#12181f]`}>
        <p>{eyebrow}</p>
        <p>{title}</p>
        <p className="mt-2 text-[#12181f]">—</p>
      </div>
    </div>
  );
}
