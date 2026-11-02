"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { introRouteAllowed, introSessionKey, introSessionStep, introStartEvent, introSteps, introStorageKey, introVisibilityEvent, introWasSeen } from "@/lib/intro";
import { scrollToTarget } from "@/lib/scroll-navigation";

type Position = { x: number; y: number; width: number; height: number; panelX: number; panelY: number; viewportHeight: number; side: boolean };
const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]';

export function IntroReplayButton() {
  return <button type="button" className="intro-replay" onClick={() => window.dispatchEvent(new Event(introStartEvent))}>Einführung ansehen</button>;
}

export function FirstVisitIntro({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(-1);
  const [position, setPosition] = useState<Position | null>(null);
  const [practicing, setPracticing] = useState(false);
  const [searchTried, setSearchTried] = useState(false);
  const [generation, setGeneration] = useState(0);
  const checked = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const target = useRef<HTMLElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const item = step >= 0 ? introSteps[step] : null;
  const aligned = item?.path === pathname;
  const active = visible && step >= 0;
  const shown = visible && (introRouteAllowed(pathname) || (active && ["/kontakt", "/registrieren"].includes(pathname)));

  const dismiss = useCallback((outcome: "completed" | "skipped", startRegistration = false) => {
    try { localStorage.setItem(introStorageKey, outcome); } catch { /* The tour remains dismissible without storage. */ }
    try { sessionStorage.removeItem(introSessionKey); } catch { /* In-memory dismissal still works. */ }
    const restore = panel.current?.contains(document.activeElement);
    const destination = startRegistration
      ? document.querySelector<HTMLElement>('[data-intro="account"] form button:not(:disabled)')
      : target.current?.querySelector<HTMLElement>(focusable) || previousFocus.current;
    setVisible(false); setPosition(null);
    if (restore || startRegistration) requestAnimationFrame(() => {
      const element = destination?.isConnected ? destination : document.querySelector<HTMLElement>("#main-content h1");
      if (element && !element.matches(focusable)) element.setAttribute("tabindex", "-1");
      element?.focus({ preventScroll: true });
    });
  }, []);

  const go = useCallback((next: number) => {
    const destination = introSteps[next];
    if (!destination) return;
    setPosition(null); setPracticing(false); setSearchTried(false); setStep(next); setVisible(true); setGeneration(current => current + 1);
    try { sessionStorage.setItem(introSessionKey, String(next)); } catch { /* In-memory navigation still works. */ }
    if (pathname !== destination.path) router.push(destination.path, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    if (checked.current || authenticated) return;
    let resume: number | null = null;
    let seen = false;
    try { resume = introSessionStep(sessionStorage.getItem(introSessionKey)); } catch { /* The invitation works without session storage. */ }
    try { seen = introWasSeen(localStorage.getItem(introStorageKey)); } catch { /* The invitation works without local storage. */ }
    if (resume !== null) { checked.current = true; setStep(resume); setVisible(true); }
    else if (introRouteAllowed(pathname)) { checked.current = true; if (!seen) setVisible(true); }
  }, [authenticated, pathname]);

  useEffect(() => {
    const replay = () => {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      go(0);
    };
    window.addEventListener(introStartEvent, replay);
    return () => window.removeEventListener(introStartEvent, replay);
  }, [go]);

  useEffect(() => {
    if (active && shown) document.documentElement.dataset.guidedTour = "true";
    else delete document.documentElement.dataset.guidedTour;
    window.dispatchEvent(new Event(introVisibilityEvent));
    if (!shown) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) dismiss("skipped");
    };
    window.addEventListener("keydown", escape);
    return () => { delete document.documentElement.dataset.guidedTour; window.removeEventListener("keydown", escape); window.dispatchEvent(new Event(introVisibilityEvent)); };
  }, [shown, active, dismiss]);

  useEffect(() => {
    target.current = null;
    if (!active || !shown || !aligned || !item) return;
    let frame = 0;
    let scrolledElement: HTMLElement | null = null;
    const update = () => {
      frame = 0;
      const element = item.target.split(",").map(selector => document.querySelector<HTMLElement>(selector.trim())).find(Boolean);
      if (!element || !panel.current) return;
      target.current = element;
      const viewport = window.visualViewport;
      const width = viewport?.width || innerWidth;
      const height = viewport?.height || innerHeight;
      const offset = viewport?.offsetTop || 0;
      const headerBottom = Math.max(offset + 12, document.querySelector(".public-header")?.getBoundingClientRect().bottom || 64);
      if (scrolledElement !== element) {
        scrolledElement = element;
        // Sticky controls need their original document position, not the offset
        // inherited from the previous route. Extra tour space keeps end-of-page
        // targets above the mobile coachmark as well.
        scrollToTarget(0, true);
        scrollToTarget(Math.max(0, scrollY + element.getBoundingClientRect().top - headerBottom - 26), true);
        heading.current?.focus({ preventScroll: true });
      }
      const box = element.getBoundingClientRect();
      const panelBox = panel.current.getBoundingClientRect();
      const cardWidth = Math.min(390, width - 32);
      const cardHeight = Math.min(panelBox.height, height - 96);
      const side = width >= 1000 && width - box.right > cardWidth + 40;
      const panelX = side ? box.right + 24 : Math.max(16, Math.min(box.left, width - cardWidth - 24));
      const panelY = width < 768
        ? Math.max(offset + 16, offset + height - cardHeight - 16)
        : side ? Math.max(headerBottom + 24, Math.min(box.top, offset + height - cardHeight - 24))
          : Math.min(Math.max(headerBottom + 24, box.bottom + 20), offset + height - cardHeight - 24);
      const y = Math.max(headerBottom + 8, box.top - 6);
      const bottom = Math.min(box.bottom + 6, side ? offset + height - 12 : panelY - 16);
      const next = { x: Math.max(8, box.left - 6), y, width: Math.min(box.width + 12, width - Math.max(8, box.left - 6) - 8), height: Math.max(0, bottom - y), panelX, panelY, viewportHeight: height, side };
      setPosition(current => current && Object.keys(next).every(key => current[key as keyof Position] === next[key as keyof Position]) ? current : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const main = document.getElementById("main-content");
    const resize = new ResizeObserver(schedule);
    if (main) resize.observe(main);
    if (panel.current) resize.observe(panel.current);
    const mutations = new MutationObserver(schedule);
    if (main) mutations.observe(main, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    const settled = setTimeout(schedule, 450);
    schedule();
    return () => {
      clearTimeout(settled);
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect(); mutations.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule); window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [active, shown, aligned, item, pathname, generation]);

  useEffect(() => {
    if (!active) return;
    const focus = () => setPracticing(item?.id === "rules" && Boolean(target.current?.contains(document.activeElement)));
    const input = (event: Event) => {
      if (item?.id === "rules" && event.target instanceof HTMLInputElement && target.current?.contains(event.target) && event.target.value.trim()) setSearchTried(true);
    };
    const submit = (event: Event) => {
      if (item?.id === "account" && event.target instanceof HTMLFormElement && target.current?.contains(event.target)) dismiss("completed");
    };
    document.addEventListener("focusin", focus); document.addEventListener("input", input); document.addEventListener("submit", submit, true);
    return () => { document.removeEventListener("focusin", focus); document.removeEventListener("input", input); document.removeEventListener("submit", submit, true); };
  }, [active, item, dismiss]);

  if (!shown) return null;
  const last = step === introSteps.length - 1;
  const ready = aligned && position;
  const style = active && position ? { left: position.panelX, top: position.panelY, right: "auto", bottom: "auto", "--intro-viewport-height": `${position.viewportHeight}px` } as CSSProperties : undefined;
  return <>
    {ready && position.height > 12 && <svg className="intro-spotlight" aria-hidden="true"><defs><mask id="intro-cutout"><rect width="100%" height="100%" fill="white" /><rect x={position.x} y={position.y} width={position.width} height={position.height} rx="12" fill="black" /></mask></defs><rect width="100%" height="100%" className="intro-shade" mask="url(#intro-cutout)" /><rect data-intro-ring x={position.x} y={position.y} width={position.width} height={position.height} rx="12" fill="none" stroke="var(--accent-ink)" strokeWidth="2" /></svg>}
    <aside ref={panel} className="intro-panel" data-tour-step={item?.id || "welcome"} data-practicing={practicing ? "true" : "false"} aria-label="Einführung" aria-describedby="intro-copy" style={style} data-lenis-prevent>
      <div className="intro-panel-header">
        <p className="intro-progress" role="status">{item ? `Schritt ${step + 1} von ${introSteps.length} · ${item.label}` : "Dein erster Besuch"}</p>
        <button type="button" className="intro-skip" onClick={() => dismiss("skipped")}>Überspringen</button>
      </div>
      {item && <div className="intro-track" aria-hidden="true">{introSteps.map((station, index) => <span key={station.id} data-current={index <= step ? "true" : "false"} />)}</div>}
      <h2 ref={heading} id="intro-heading" tabIndex={-1}>{item?.title || "Lerne DRP direkt kennen."}</h2>
      <p id="intro-copy" className="intro-copy">{item?.text || "Wir führen dich zu den wichtigen Bereichen und zeigen dir, wie du sie benutzt. Zum Schluss landest du direkt bei der Registrierung."}</p>
      {!item && <p className="intro-hint">Sechs kurze Stationen. Du kannst alles ausprobieren, zurückgehen oder jederzeit aussteigen.</p>}
      {item && aligned && <p className="intro-hint">{searchTried ? "Deine Suche funktioniert. Öffne einen Treffer oder gehe zur nächsten Station." : item.hint}</p>}
      {item && !aligned && <p className="intro-hint">Du schaust dich gerade um. Die Tour wartet auf dich.</p>}
      {item?.id === "rules" && aligned && !practicing && <button type="button" className="intro-try" onClick={() => target.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true })}>Suche ausprobieren<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>}
      <div className="intro-actions">
        {step > 0 && <button type="button" className="button button-secondary" onClick={() => go(step - 1)}>Zurück</button>}
        {!item ? <button type="button" className="button button-primary" onClick={() => { previousFocus.current = document.activeElement as HTMLElement; go(0); }}>Einführung starten</button>
          : !aligned ? <button type="button" className="button button-primary" onClick={() => go(step)}>Zurück zur Tour</button>
          : last ? authenticated ? <a className="button button-primary" href="/dashboard" onClick={() => dismiss("completed")}>Mein DRP öffnen</a> : <button type="button" className="button button-primary" onClick={() => dismiss("completed", true)}>Jetzt Konto erstellen</button>
          : <button type="button" className="button button-primary" onClick={() => go(step + 1)}>Weiter: {introSteps[step + 1].label}</button>}
      </div>
    </aside>
  </>;
}
