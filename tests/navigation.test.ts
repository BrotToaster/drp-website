import { describe, expect, it } from "vitest";
import { filterNavigationGroups, staffNavigation } from "@/lib/navigation";

describe("rollenabhängige Portalnavigation", () => {
  it("blendet unerlaubte Routen vollständig aus", () => {
    const groups = filterNavigationGroups(staffNavigation, (permission) => permission === "staff.access");
    const paths = groups.flatMap((group) => group.items.map((item) => item.href));
    expect(paths).toContain("/staff");
    expect(paths).toContain("/staff/bewerbungen");
    expect(paths).not.toContain("/staff/nutzer");
    expect(paths).not.toContain("/staff/dokumente");
  });

  it("entfernt leere Gruppen", () => {
    const groups = filterNavigationGroups(staffNavigation, () => false);
    expect(groups.flatMap((group) => group.items).every((item) => !item.permission)).toBe(true);
  });
});
