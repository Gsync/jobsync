/**
 * Shared return type for server actions that follow the success/data pattern.
 *
 * Usage:
 *   export async function myAction(): Promise<ActionResult<MyData>> {
 *     return { success: true, data: myData };
 *   }
 *
 * NOTE: Not all server actions use this pattern:
 * - Pattern B functions (getAllX) return raw arrays and throw on error
 * - Pattern C functions (dashboard) return custom shapes
 * See specs/action-result.allium for the full classification.
 */
export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  total?: number;
  message?: string;
}
