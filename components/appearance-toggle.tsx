"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { appearanceKey, resolveAppearance, type Appearance } from "@/lib/appearance";

export function AppearanceToggle() {
  const [appearance, setAppearance] = useState<Appearance>("light");
  const [games, setGames] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [escaped, setEscaped] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [sun, setSun] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pathname = usePathname();
  const playing = games.length > 0 && appearance === "dark";
  useEffect(() => { setGames([]); }, [pathname]);
  useEffect(() => {
    if (!playing) return;
    panel.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setGames([]); trigger.current?.focus(); }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [playing, round]);
  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      let preference: string | null = null;
      try { preference = localStorage.getItem(appearanceKey); } catch { /* Storage can be blocked. */ }
      const next = resolveAppearance(preference, system.matches);
      document.documentElement.dataset.appearance = next;
      setAppearance(next);
    };
    const sync = () => setAppearance(document.documentElement.dataset.appearance === "dark" ? "dark" : "light");
    sync();
    system.addEventListener("change", update);
    window.addEventListener("storage", update);
    window.addEventListener("drp:appearance", sync);
    return () => {
      system.removeEventListener("change", update);
      window.removeEventListener("storage", update);
      window.removeEventListener("drp:appearance", sync);
    };
  }, []);
  const apply = (next: Appearance) => {
    setGames([]);
    try { localStorage.setItem(appearanceKey, next); } catch { /* The choice still works for this page. */ }
    document.documentElement.dataset.appearance = next;
    window.dispatchEvent(new Event("drp:appearance"));
  };
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (appearance === "light") return apply("dark");
    if (event.detail === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply("light");
    if (playing) return setGames([]);
    const deck = ["catch", "sun", "dimmer"];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    setRound(0); setEscaped(false); setBrightness(0);
    setSun(Math.floor(Math.random() * 3)); setGames(deck);
  };
  const advance = () => {
    if (round >= 2) { apply("light"); trigger.current?.focus(); }
    else { setRound(value => value + 1); setEscaped(false); setBrightness(0); }
  };
  const direct = () => { apply("light"); trigger.current?.focus(); };
  const game = games[round];
  return (
    <>
    <button ref={trigger} type="button" className="appearance-toggle" aria-label="Dunkles Design" aria-pressed={appearance === "dark"} aria-expanded={playing} aria-controls={playing ? id : undefined} title={appearance === "dark" ? "Helles Design einschalten" : "Dunkles Design einschalten"} onClick={toggle}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {appearance === "dark" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" /></> : <path d="M20.9 13.2A9 9 0 0 1 10.8 3.1 9 9 0 1 0 20.9 13.2Z" />}
      </svg>
    </button>
    {playing && createPortal(<section ref={panel} id={id} className="light-game" tabIndex={-1} aria-label="Kleine Lichtspiele">
      <div className="light-game-top"><span>Runde {round + 1} von 3</span><button type="button" aria-label="Lichtspiele schließen" onClick={() => { setGames([]); trigger.current?.focus(); }}>×</button></div>
      <h2>Der Dark Mode klammert.</h2>
      <p aria-live="polite">{game === "catch" ? escaped ? "Okay, jetzt hält er still. Schnapp ihn dir." : "Der Lichtschalter hat heute Beine. Fang ihn." : game === "sun" ? "Eine Sonne, zwei Monde. Wo geht das Licht an?" : "Ein bisschen heller geht noch. Zieh das Licht auf."}</p>
      <div className="light-game-stage" data-game={game}>
        {game === "catch" && <div className="light-game-chase" data-escaped={escaped}><button type="button" className="button button-primary" onPointerEnter={event => { if (event.pointerType === "mouse" && !escaped) setEscaped(true); }} onClick={event => { if (!escaped && event.detail !== 0) setEscaped(true); else advance(); }}>Licht an</button></div>}
        {game === "sun" && <div className="light-game-choices">{[0, 1, 2].map(index => <button key={index} type="button" aria-label={index === sun ? "Sonne wählen" : `Mond ${index + 1} wählen`} onClick={advance}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">{index === sun ? <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></> : <path d="M20.9 13.2A9 9 0 0 1 10.8 3.1 9 9 0 1 0 20.9 13.2Z"/>}</svg></button>)}</div>}
        {game === "dimmer" && <label className="light-game-dimmer">Lichtstärke <output>{brightness} %</output><input aria-label="Lichtstärke" type="range" min="0" max="100" value={brightness} onChange={event => { const value = Number(event.target.value); setBrightness(value); if (value >= 90) advance(); }}/></label>}
      </div>
      <div className="light-game-footer"><span>Spätestens nach 3 Runden ist Schluss.</span><button type="button" onClick={direct}>Direkt hell schalten</button></div>
    </section>, document.body)}
    </>
  );
}
