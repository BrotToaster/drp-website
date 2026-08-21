"use client";

import { useMemo, useState } from "react";

export type OperationsPlayer = {
  id: string;
  name: string;
  team: string;
  callsign: string;
  wanted: number;
  location: string;
  identity?: string;
};

export type OperationsEvent = {
  id: string;
  kind: "Join" | "Command" | "Mod-Call";
  title: string;
  detail?: string;
  time: string;
};

export function OperationsLivePanel({ players, events }: { players: OperationsPlayer[]; events: OperationsEvent[] }) {
  const [tab, setTab] = useState<"players" | "events">("players");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const teams = useMemo(() => [...new Set(players.map((player) => player.team).filter((item) => item !== "–"))].sort(), [players]);
  const normalized = query.trim().toLocaleLowerCase("de");
  const visiblePlayers = players.filter((player) => (!team || player.team === team) && (!normalized || [player.name, player.team, player.callsign, player.location, player.identity].join(" ").toLocaleLowerCase("de").includes(normalized)));
  const visibleEvents = events.filter((event) => !normalized || [event.kind, event.title, event.detail].join(" ").toLocaleLowerCase("de").includes(normalized));

  return <section className="surface overflow-hidden">
    <div className="flex flex-wrap items-end gap-3 border-b border-white/[0.07] p-5">
      <div className="mr-auto"><h2 className="font-semibold">Live-Betrieb</h2><p className="mt-1 text-xs text-[#777d81]">ER:LC-Daten werden angezeigt, aber nicht als Spielerakte gespeichert.</p></div>
      <label className="min-w-[210px] text-[10px] font-bold uppercase tracking-[.1em] text-[#676d72]">Suchen<input className="field mt-1 !min-h-10" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Spieler, Callsign, Ereignis" /></label>
      {tab === "players" && <label className="min-w-[160px] text-[10px] font-bold uppercase tracking-[.1em] text-[#676d72]">Team<select className="field mt-1 !min-h-10" value={team} onChange={(event) => setTeam(event.target.value)}><option value="">Alle</option>{teams.map((item) => <option key={item}>{item}</option>)}</select></label>}
    </div>
    <div className="flex gap-2 border-b border-white/[0.07] px-5 py-3" role="tablist" aria-label="Live-Betrieb Ansicht">
      <button className={tab === "players" ? "badge badge-gold" : "badge"} type="button" role="tab" aria-selected={tab === "players"} onClick={() => setTab("players")}>Spieler · {players.length}</button>
      <button className={tab === "events" ? "badge badge-gold" : "badge"} type="button" role="tab" aria-selected={tab === "events"} onClick={() => setTab("events")}>Ereignisse · {events.length}</button>
    </div>
    {tab === "players" ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Spieler</th><th>Identitäten</th><th>Team</th><th>Callsign</th><th>Wanted</th><th>Position</th></tr></thead><tbody>{visiblePlayers.map((player) => <tr key={player.id}><td className="font-semibold">{player.name}</td><td className="text-[#858b90]">{player.identity || "Nicht verknüpft"}</td><td>{player.team}</td><td>{player.callsign}</td><td>{player.wanted}</td><td>{player.location}</td></tr>)}</tbody></table>{!visiblePlayers.length && <p className="p-7 text-center text-sm text-[#777d81]">Keine passenden Spieler gefunden.</p>}</div>
      : <div className="grid gap-2 p-4">{visibleEvents.map((event) => <article key={event.id} className="grid gap-2 rounded-xl border border-white/[0.07] p-4 sm:grid-cols-[90px_1fr_auto]"><span className="text-xs font-bold text-[#f2c14e]">{event.kind}</span><div><p className="text-sm font-semibold">{event.title}</p>{event.detail && <p className="mt-1 text-xs text-[#777d81]">{event.detail}</p>}</div><time className="text-[10px] text-[#676d72]">{event.time}</time></article>)}{!visibleEvents.length && <p className="p-4 text-center text-sm text-[#777d81]">Keine passenden Ereignisse gefunden.</p>}</div>}
  </section>;
}
