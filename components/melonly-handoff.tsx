export function MelonlyHandoff({
  title,
  description,
  melonlyUrl,
  items,
}: {
  title: string;
  description: string;
  melonlyUrl: string;
  items: string[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <section className="surface relative overflow-hidden p-7 md:p-10">
        <div className="absolute inset-y-0 left-0 w-1 bg-[#f2c14e]" />
        <span className="badge badge-gold">Zentrale Verwaltung in Melonly</span>
        <h2 className="display-font mt-6 text-4xl font-bold tracking-tight md:text-5xl">{title}</h2>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[#a8adb2]">{description}</p>
        <a className="button button-primary mt-8" href={melonlyUrl} target="_blank" rel="noreferrer">
          In Melonly öffnen <span aria-hidden="true">↗</span>
        </a>
      </section>
      <aside className="surface p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#777d81]">So ist die Zuständigkeit aufgeteilt</p>
        <ul className="mt-6 grid gap-4 text-sm leading-6 text-[#a8adb2]">
          {items.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f2c14e]" /><span>{item}</span></li>)}
        </ul>
        <p className="mt-7 border-t border-white/[0.07] pt-5 text-xs leading-6 text-[#777d81]">Diese DRP-Adresse bleibt als verständlicher Übergang erhalten. Hier werden keine parallelen Fachdaten angelegt.</p>
      </aside>
    </div>
  );
}
