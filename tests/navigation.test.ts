import { describe, expect, it } from "vitest";
import { allNavigationItems, dashboardNavigation, filterNavigationGroups, staffNavigation } from "@/lib/navigation";

describe("rollenabhängige Portalnavigation", () => {
  it("blendet unerlaubte Routen vollständig aus", () => {
    const groups = filterNavigationGroups(staffNavigation, (permission) => permission === "staff.access");
    const paths = groups.flatMap((group) => group.items.map((item) => item.href));
    expect(paths).toContain("/staff");
    expect(paths).not.toContain("/staff/bewerbungen");
    expect(paths).not.toContain("/staff/sanktionen");
    expect(paths).not.toContain("/staff/nutzer");
    expect(paths).not.toContain("/staff/dokumente");
  });

  it("enthält keine vollständig entfernten Übergabeseiten", () => {
    const paths = [
      ...dashboardNavigation.flatMap((group) => group.items.map((item) => item.href)),
      ...allNavigationItems.map((item) => item.href),
    ];
    expect(paths).not.toEqual(expect.arrayContaining([
      "/dashboard/bewerbung",
      "/staff/bewerbungen",
      "/staff/sanktionen",
    ]));
  });

  it("entfernt leere Gruppen", () => {
    const groups = filterNavigationGroups(staffNavigation, () => false);
    expect(groups.flatMap((group) => group.items).every((item) => !item.permission)).toBe(true);
  });
});
