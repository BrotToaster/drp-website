"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PublicServerStatus } from "@/lib/erlc";
import { RelativeTime } from "@/components/relative-time";

export function CinematicMapCard({ mapUrl, status }: { mapUrl: string; status: PublicServerStatus }) {
  const card = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [nightShift, setNightShift] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const clicks = useRef(0);

  useEffect(() => {
    setNightShift(sessionStorage.getItem("drp-night-shift") === "true");
    let sequence = "";
    const onKey = (event: KeyboardEvent) => {
      sequence = (sequence + event.key.toLowerCase()).slice(-4);
      if (sequence === "10-8") {
        const next = !nightShift;
        setNightShift(next);
        sessionStorage.setItem("drp-night-shift", String(next));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nightShift]);

  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(max-width: 900px), (prefers-reduced-motion: reduce)").matches || (navigator.hardwareConcurrency || 8) <= 4) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    const rect = event.currentTarget.getBoundingClientRect();
    frame.current = requestAnimationFrame(() => {
      card.current?.style.setProperty("--map-x", `${((event.clientX - rect.left) / rect.width - 0.5) * 8}px`);
      card.current?.style.setProperty("--map-y", `${((event.clientY - rect.top) / rect.height - 0.5) * 8}px`);
    });
  };
  const reset = () => { card.current?.style.setProperty("--map-x", "0px"); card.current?.style.setProperty("--map-y", "0px"); };
  const statusClick = () => {
    clicks.current += 1;
    if (clicks.current >= 5) {
      clicks.current = 0;
      setConfirmed(true);
      window.setTimeout(() => setConfirmed(false), 2800);
    }
  };

  return <div ref={card} className={`cinematic-map ${nightShift ? "night-shift" : ""} ${status.stale || !status.online ? "map-stale" : ""}`} onPointerMove={pointerMove} onPointerLeave={reset}>
    <div className="cinematic-map-glow" />
    <div className="cinematic-map-frame">
      <div className="cinematic-map-image"><Image src={mapUrl} alt="Offizielle Karte von Liberty County" fill sizes="(max-width: 1024px) 100vw, 520px" className="object-cover" priority /></div>
      <div className="cinematic-grid" /><div className="cinematic-vignette" /><div className="cinematic-scanline" />
      <div className="cinematic-topbar"><div><p>Live aus Liberty County</p><strong>{status.name}</strong></div><button type="button" className="cinematic-live" onClick={statusClick}><span className={`status-dot ${status.online && !status.stale ? "" : "offline"}`} />{status.stale ? "Veraltet" : status.online ? "Online" : "Offline"}</button></div>
      <div className="cinematic-hud"><div><span>Spieler</span><strong>{status.players ?? "–"}</strong></div><div><span>Slots</span><strong>{status.maxPlayers ?? "–"}</strong></div><div><span>Queue</span><strong>{status.queue ?? "–"}</strong></div></div>
      <div className="cinematic-sync"><RelativeTime value={status.lastSuccessfulAt} />{status.error && status.checkedAt && <><span>·</span><RelativeTime value={status.checkedAt} prefix="Letzter Versuch" /></>}</div>
      <span className="cinematic-source">Offizielle ER:LC-Karte</span>
      {nightShift && <span className="night-shift-label">Night Shift · 10-8</span>}
      {confirmed && <div className="dispatch-confirmed" role="status">Leitstelle bestätigt · 10-8</div>}
    </div>
  </div>;
}
