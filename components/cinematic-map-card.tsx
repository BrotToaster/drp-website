"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PublicServerStatus } from "@/lib/erlc";
import { RelativeTime } from "@/components/relative-time";

export function CinematicMapCard({ mapUrl, status }: { mapUrl: string; status: PublicServerStatus }) {
  const [nightShift, setNightShift] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const clicks = useRef(0);

  useEffect(() => {

    let sequence = "";
    const onKey = (event: KeyboardEvent) => {
      sequence = (sequence + event.key.toLowerCase()).slice(-4);
      if (sequence === "10-8") {
        const next = !nightShift;
        setNightShift(next);

      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nightShift]);

  const statusClick = () => {
    clicks.current += 1;
    if (clicks.current >= 5) {
      clicks.current = 0;
      setConfirmed(true);
      window.setTimeout(() => setConfirmed(false), 2800);
    }
  };

  return <div className={`cinematic-map ${nightShift ? "night-shift" : ""} ${status.stale || !status.online ? "map-stale" : ""}`}>
    <div className="cinematic-map-frame">
      <svg className="map-frame-trace" viewBox="0 0 480 490" preserveAspectRatio="none" aria-hidden="true"><path data-map-trace d="M16 1H464Q479 1 479 16V474Q479 489 464 489H16Q1 489 1 474V16Q1 1 16 1Z" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>
      <div className="cinematic-map-image"><Image src={mapUrl} alt="Offizielle Karte von Liberty County" fill sizes="(max-width: 1120px) 100vw, 1080px" className="object-cover" priority /></div>
      <div className="cinematic-grid" /><div className="cinematic-vignette" /><div className="cinematic-scanline" />
      <div className="cinematic-topbar"><div><p>Live aus Liberty County</p><strong>{status.name}</strong></div><button type="button" className="cinematic-live" onClick={statusClick}><span className={`status-dot ${status.online && !status.stale ? "" : "offline"}`} />{status.stale ? "Veraltet" : status.online ? "Online" : "Offline"}</button></div>
      <div className="cinematic-hud"><div><i data-hud-edge aria-hidden="true" /><span>Spieler</span><strong>{status.players ?? "–"}</strong></div><div><i data-hud-edge aria-hidden="true" /><span>Slots</span><strong>{status.maxPlayers ?? "–"}</strong></div><div><i data-hud-edge aria-hidden="true" /><span>Queue</span><strong>{status.queue ?? "–"}</strong></div></div>
      <div className="cinematic-sync"><RelativeTime value={status.lastSuccessfulAt} />{status.error && status.checkedAt && <><span>·</span><RelativeTime value={status.checkedAt} prefix="Letzter Versuch" /></>}</div>
      <span className="cinematic-source">Offizielle ER:LC-Karte</span>
      {nightShift && <span className="night-shift-label">Night Shift · 10-8</span>}
      {confirmed && <div className="dispatch-confirmed" role="status">Leitstelle bestätigt · 10-8</div>}
    </div>
  </div>;
}
