export type ActionResult<T = unknown> =
  | { ok: true; message: string; data?: T }
  | { ok: false; message: string; code?: "VALIDATION" | "FORBIDDEN" | "CONFLICT" | "SERVER" };

export const initialActionResult: ActionResult = {
  ok: true,
  message: "",
};
