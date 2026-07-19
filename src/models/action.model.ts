export type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; message: string };
