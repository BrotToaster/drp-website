import { describe, expect, it } from "vitest";
import { parseErlcPlayerIdentity, parseRateLimitReset, parseRetryAfter, projectErlcLocation, resolveErlcBackoff, toLivePlayer } from "@/lib/erlc-location";

describe("ER:LC-Live-Kartendaten", () => {
  it("trennt Benutzername und Roblox-ID am letzten API-Trennzeichen", () => {
    expect(parseErlcPlayerIdentity("DemoOfficer:123456")).toEqual({ username: "DemoOfficer", robloxUserId: "123456" });
    expect(parseErlcPlayerIdentity("OhneId")).toEqual({ username: "OhneId", robloxUserId: "" });
  });

  it("projiziert den Kartenmittelpunkt und begrenzt Außenwerte", () => {
    expect(projectErlcLocation(0, 0)).toEqual({ left: 50, top: 50 });
    expect(projectErlcLocation(-9999, 9999)).toEqual({ left: 0, top: 100 });
  });

  it("gibt nur Spieler mit endlichen Koordinaten an die Karte weiter", () => {
    expect(toLivePlayer({ Player: "Test:42", Team: "Sheriff", Location: { LocationX: 50, LocationZ: -25 } })).toMatchObject({ username: "Test", robloxUserId: "42", location: { x: 50, z: -25 } });
    expect(toLivePlayer({ Player: "Test:42" })).toBeNull();
  });

  it("interpretiert Retry-After als Sekunden oder Datum", () => {
    expect(parseRetryAfter("2", 0)).toBe(2000);
    expect(parseRetryAfter("Thu, 01 Jan 1970 00:00:05 GMT", 1000)).toBe(4000);
    expect(parseRetryAfter("ungültig", 0)).toBeNull();
    expect(parseRateLimitReset("5", 1000)).toBe(4000);
    expect(resolveErlcBackoff({ bodyRetryAfter: 3 }, 0)).toBe(3000);
    expect(resolveErlcBackoff({ retryAfter: "2", bodyRetryAfter: 9 }, 0)).toBe(2000);
    expect(resolveErlcBackoff({}, 0, 7500)).toBe(7500);
  });
});
