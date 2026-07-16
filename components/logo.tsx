import Image from "next/image";
import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="DRP Startseite">
      <Image
        src="/drp-logo.png"
        alt=""
        width={48}
        height={48}
        priority
        className="h-11 w-11 object-contain"
      />
      {!compact && (
        <span className="leading-none">
          <strong className="block text-[15px] tracking-[0.16em]">DRP</strong>
          <span className="mt-1 block text-[9px] uppercase tracking-[0.18em] text-[#858b90]">
            Deutschland Roleplay
          </span>
        </span>
      )}
    </Link>
  );
}
