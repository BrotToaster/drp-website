import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeading({
  title,
  copy,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h2 className="section-title">{title}</h2>
      {copy && <p className="body-large mt-5">{copy}</p>}
    </div>
  );
}

export function PageIntro({
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-[var(--line)]">
      <div className="container-shell py-20 md:py-28">
        <h1 className="page-title max-w-4xl">{title}</h1>
        <p className="body-large max-w-2xl">{copy}</p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent-ink)] transition hover:gap-3"
    >
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface grid min-h-52 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-soft)] text-[var(--accent-ink)]">
          ·
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{copy}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
