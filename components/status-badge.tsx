const labels: Record<string, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  WAITING_USER: "Wartet auf dich",
  RESOLVED: "Gelöst",
  CLOSED: "Geschlossen",
  DRAFT: "Entwurf",
  SUBMITTED: "Eingereicht",
  UNDER_REVIEW: "In Prüfung",
  ACCEPTED: "Angenommen",
  REJECTED: "Abgelehnt",
  ACTIVE: "Aktiv",
  REVOKED: "Aufgehoben",
  EXPIRED: "Abgelaufen",
  WARNING: "Verwarnung",
  BAN: "Ban",
};

export function StatusBadge({ status }: { status: string }) {
  const positive = ["ACCEPTED", "RESOLVED"].includes(status);
  const negative = ["REJECTED", "BAN", "ACTIVE"].includes(status);
  return (
    <span
      className={
        "badge " +
        (positive
          ? "!border-[#57c98c]/25 !bg-[#57c98c]/10 !text-[#75d7a3]"
          : negative
            ? "!border-[#ef6f6c]/25 !bg-[#ef6f6c]/10 !text-[#f28d8a]"
            : "badge-gold")
      }
    >
      {labels[status] || status.replaceAll("_", " ")}
    </span>
  );
}
