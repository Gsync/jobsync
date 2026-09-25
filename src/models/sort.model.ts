export type SortDir = "asc" | "desc";

export type SortState<F extends string = string> = { field: F; dir: SortDir };
