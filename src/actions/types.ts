// Shared result shape for server actions — the project's { success, data, error }
// convention, with the success payload folded in. On failure, `error` is a
// user-facing message suitable for inline display.
export type ActionResult<T = unknown> =
  | ({ success: true } & T)
  | { success: false; error: string };
