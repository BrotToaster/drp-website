"use client";

import { useMemo, useState } from "react";

export type DiscordRoleOption = {
  id: string;
  name: string;
  guildId: string;
  color: string | null;
  position: number;
};

export function DiscordRolePicker({
  roles,
  selectedIds = [],
}: {
  roles: DiscordRoleOption[];
  selectedIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const normalized = query.trim().toLocaleLowerCase("de");
  const matches = (role: DiscordRoleOption) =>
    !normalized || `${role.name} ${role.guildId}`.toLocaleLowerCase("de").includes(normalized);
  const visibleCount = roles.filter(matches).length;

  return (
    <fieldset className="discord-role-picker md:col-span-2">
      <input type="hidden" name="manageDiscordMappings" value="1" />
      <legend className="field-label">Discord-Rollen</legend>
      <p className="mb-3 text-xs font-normal leading-5 text-[#777d81]">
        Ausgewählte Discord-Rollen vergeben diese Website-Rolle automatisch. Mehrfachauswahl ist möglich.
      </p>
      <label className="discord-role-search">
        <span className="sr-only">Discord-Rollen durchsuchen</span>
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Discord-Rollen durchsuchen …"
        />
      </label>
      <div className="discord-role-options">
        {roles.map((role) => (
          <label key={role.id} className="discord-role-option" hidden={!matches(role)}>
            <input
              type="checkbox"
              name="discordRoleIds"
              value={role.id}
              defaultChecked={selected.has(role.id)}
            />
            <span
              className="discord-role-color"
              style={{ backgroundColor: role.color || "#858b90" }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <strong>{role.name}</strong>
              <small>Position {role.position} · Guild {role.guildId}</small>
            </span>
          </label>
        ))}
        {!visibleCount && (
          <p className="p-4 text-center text-xs text-[#777d81]">
            {roles.length ? "Keine passende Discord-Rolle gefunden." : "Noch keine Discord-Rollen synchronisiert."}
          </p>
        )}
      </div>
    </fieldset>
  );
}
