export type ActionResult<T = unknown> =
  | { ok: true; message: string; data?: T; mutationId?: string; refresh?: "soft" | "navigate" | "none"; target?: string }
  | { ok: false; message: string; code?: "VALIDATION" | "FORBIDDEN" | "CONFLICT" | "SERVER"; mutationId?: string };

export function actionSuccess<T>(message: string, options: { data?: T; refresh?: "soft" | "navigate" | "none"; target?: string } = {}): ActionResult<T> {
  return { ok: true, message, mutationId: crypto.randomUUID(), ...options };
}

export const initialActionResult: ActionResult = {
  ok: true,
  message: "",
};
