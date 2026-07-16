import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import fixture from "@/data/rules.fixture.json";
import { isNavigationActive } from "@/lib/navigation";

const EXPECTED_RULE_CHECKSUM =
  "cc513127182db3d2256a85a25e9619e512217528703bc534d0ff61c5d78754f5";

describe("Regelwerk-Fixture", () => {
  it("enthält die geprüfte wortgetreue Fassung", () => {
    const checksum = createHash("sha256")
      .update(JSON.stringify(fixture.rules))
      .digest("hex");
    expect(fixture.rules).toHaveLength(60);
    expect(fixture.checksum).toBe(EXPECTED_RULE_CHECKSUM);
    expect(checksum).toBe(EXPECTED_RULE_CHECKSUM);
  });
});

describe("Aktive Navigation", () => {
  it("markiert Unterseiten im übergeordneten Reiter", () => {
    expect(isNavigationActive("/news/ein-beitrag", "/news")).toBe(true);
    expect(isNavigationActive("/dashboard/tickets/123", "/dashboard/tickets")).toBe(true);
    expect(isNavigationActive("/server", "/")).toBe(false);
  });

  it("unterstützt exakte Übersichtslinks", () => {
    expect(isNavigationActive("/staff", "/staff", true)).toBe(true);
    expect(isNavigationActive("/staff/news", "/staff", true)).toBe(false);
  });
});