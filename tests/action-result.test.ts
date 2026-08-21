import { describe, expect, it } from "vitest";
import { actionFailure, actionSuccess, ensureMutationId } from "@/lib/action-result";

describe("stabile Mutationsergebnisse", () => {
  it("vergibt für jeden Erfolg und Fehler eine eindeutige ID", () => {
    const first = actionSuccess("Gespeichert");
    const second = actionSuccess("Gespeichert");
    const failure = actionFailure("Fehler", "VALIDATION");
    expect(first.mutationId).toBeTruthy();
    expect(second.mutationId).not.toBe(first.mutationId);
    expect(failure.mutationId).toBeTruthy();
  });

  it("bewahrt vorhandene IDs und ergänzt alte Action-Antworten", () => {
    const existing = actionSuccess("Okay");
    expect(ensureMutationId(existing)).toBe(existing);
    expect(ensureMutationId({ ok: true, message: "Alt" }).mutationId).toBeTruthy();
  });
});
