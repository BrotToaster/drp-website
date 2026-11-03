import { expect, it } from "vitest";
import { safeContentHref } from "@/lib/content-links";

it("erhält interne Dokumentlinks und Abschnittsanker", () => {
  for (const value of ["/staff/dokumente/protokoll", "#verantwortlicher", "https://example.org/a", "mailto:kontakt@example.org"]) expect(safeContentHref(value)).toBe(value);
});
it("weist ausführbare, verschleierte und fremde relative Ziele ab", () => {
  for (const value of ["javascript:alert(1)", "//evil.example/a", "/\\evil.example/a", "https://user:password@example.org", "https:\n//evil.example", "data:text/html,test", null]) expect(safeContentHref(value)).toBeUndefined();
});
