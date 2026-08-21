"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { projectErlcLocation, type ErlcLiveMapSnapshot, type ErlcLivePlayer } from "@/lib/erlc-location";

const POLL_MS = 15_000;

function teamColor(team: string) {
  const value = team.toLocaleLowerCase("en");
  if (value.includes("police") || value.includes("sheriff")) return "#55a9ff";
  if (value.includes("fire") || value.includes("ems")) return "#ef6f6c";
  if (value.includes("dot") || value.includes("transport")) return "#f2c14e";
  if (value.includes("civil")) return "#b6bbc0";
  return "#8a7dff";
}

export function LiveOperationsMap() {
  const [snapshot, setSnapshot] = useState<ErlcLiveMapSnapshot | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (document.visibilityState === "hidden") return POLL_MS;
    try {
      const response = await fetch("/api/staff/erlc-live", { cache: "no-store", signal });
      const payload = await response.json() as ErlcLiveMapSnapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Live-Karte konnte nicht geladen werden.");
      setSnapshot(payload);
      setError("");
      return Math.max(POLL_MS, payload.retryAfterMs || 0);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return POLL_MS;
      setError(reason instanceof Error ? reason.message : "Live-Karte konnte nicht geladen werden.");
      return 30_000;
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    const schedule = async () => {
      controller?.abort();
      controller = new AbortController();
      const delay = await load(controller.signal);
      if (active) timer = setTimeout(schedule, delay);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void schedule();
      }
    };
    void schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      controller?.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const teams = useMemo(() => [...new Set((snapshot?.players || []).map((player) => player.team))].sort(), [snapshot]);
  const normalized = query.trim().toLocaleLowerCase("de");
  const players = (snapshot?.players || []).filter((player) =>
    (!team || player.team === team) &&
    (!normalized || [player.username, player.callsign, player.team, player.location.streetName, player.location.postalCode].join(" ").toLocaleLowerCase("de").includes(normalized)),
  );
  const selected = snapshot?.players.find((player) => `${player.robloxUserId}:${player.username}` === selectedId) || null;

  const zoom = (delta: number) => setView((current) => ({ ...current, scale: Math.min(4, Math.max(1, current.scale + delta)) }));
  const reset = () => setView({ scale: 1, x: 0, y: 0 });

  return (
    <div className="live-map-layout">
      <div className="live-map-main">
        <div className="live-map-toolbar">
          <div>
            <div className="flex items-center gap-2">
              <span className={`status-dot ${snapshot?.status !== "live" ? "offline" : ""}`} />
              <strong>{snapshot?.status === "live" ? "Live-Positionen" : snapshot?.status === "stale" ? "Letzter verfügbarer Stand" : "Live-Karte offline"}</strong>
            </div>
            <p>{snapshot ? `Stand ${new Date(snapshot.fetchedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "ER:LC wird verbunden …"}</p>
          </div>
          <label className="live-map-search"><span className="sr-only">Spieler auf der Karte suchen</span><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Spieler oder Callsign" /></label>
          <label className="live-map-team"><span className="sr-only">Kartenteam filtern</span><select value={team} onChange={(event) => setTeam(event.target.value)}><option value="">Alle Teams</option>{teams.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        {error && <p className="live-map-error" role="alert">{error}</p>}
        <div
          className="live-map-viewport"
          onWheel={(event) => {
            event.preventDefault();
            zoom(event.deltaY > 0 ? -0.2 : 0.2);
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: view.x, y: view.y };
          }}
          onPointerMove={(event) => {
            const active = drag.current;
            if (!active || active.pointerId !== event.pointerId || view.scale === 1) return;
            setView((current) => ({ ...current, x: active.x + event.clientX - active.clientX, y: active.y + event.clientY - active.clientY }));
          }}
          onPointerUp={(event) => {
            if (drag.current?.pointerId === event.pointerId) drag.current = null;
          }}
          onPointerCancel={() => { drag.current = null; }}
        >
          {snapshot?.mapUrl ? (
            <div
              className="live-map-stage"
              style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`, "--live-map-scale": view.scale } as React.CSSProperties}
            >
              <Image src={snapshot.mapUrl} alt="Offizielle ER:LC-Karte mit Live-Positionen" fill sizes="(max-width: 900px) 100vw, 900px" className="object-cover" priority={false} />
              <div className="live-map-grid" aria-hidden="true" />
              {players.map((player) => {
                const position = projectErlcLocation(player.location.x, player.location.z);
                const id = `${player.robloxUserId}:${player.username}`;
                return <button
                  key={id}
                  type="button"
                  className={`live-map-marker ${selectedId === id ? "selected" : ""}`}
                  style={{ left: `${position.left}%`, top: `${position.top}%`, "--team-color": teamColor(player.team) } as React.CSSProperties}
                  onClick={(event) => { event.stopPropagation(); setSelectedId(id); }}
                  aria-label={`${player.username}, ${player.team}${player.callsign ? `, ${player.callsign}` : ""}`}
                  title={player.username}
                >
                  <span />
                  <b>{player.callsign || player.username}</b>
                </button>;
              })}
            </div>
          ) : <div className="live-map-loading"><span className="submit-spinner" /><p>Offizielle Karte wird geladen …</p></div>}
          <div className="live-map-controls" aria-label="Kartensteuerung">
            <button type="button" onClick={() => zoom(.35)} aria-label="Karte vergrößern">+</button>
            <button type="button" onClick={() => zoom(-.35)} aria-label="Karte verkleinern">−</button>
            <button type="button" onClick={reset} aria-label="Kartenansicht zurücksetzen">⌂</button>
          </div>
          <span className="live-map-count">{players.length} / {snapshot?.players.length || 0} sichtbar</span>
        </div>
      </div>
      <aside className="live-map-detail" aria-live="polite">
        {selected ? <PlayerDetails player={selected} /> : <div className="live-map-detail-empty"><span>◎</span><h3>Einheit auswählen</h3><p>Wähle einen Marker, um Callsign, Team und die zuletzt gemeldete Position zu sehen.</p></div>}
      </aside>
    </div>
  );
}

function PlayerDetails({ player }: { player: ErlcLivePlayer }) {
  const address = [player.location.streetName, player.location.buildingNumber].filter(Boolean).join(" ");
  return <div className="live-map-player-card">
    <span className="eyebrow">Aktive Einheit</span>
    <h3>{player.username}</h3>
    <p className="live-map-player-id">Roblox-ID {player.robloxUserId || "nicht gemeldet"}</p>
    <dl>
      <div><dt>Team</dt><dd style={{ color: teamColor(player.team) }}>{player.team}</dd></div>
      <div><dt>Callsign</dt><dd>{player.callsign || "–"}</dd></div>
      <div><dt>Postal</dt><dd>{player.location.postalCode || "–"}</dd></div>
      <div><dt>Straße</dt><dd>{address || "–"}</dd></div>
      <div><dt>Wanted</dt><dd>{player.wantedStars}</dd></div>
    </dl>
    <p className="live-map-privacy">Position aus der aktuellen ER:LC-Abfrage. Es wird kein Bewegungsverlauf angelegt.</p>
  </div>;
}
