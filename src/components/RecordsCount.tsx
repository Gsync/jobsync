"use client";

type RecordsCountProps = {
  count: number;
  total: number;
  label?: string;
};

export function RecordsCount({
  count,
  total,
  label = "records",
}: RecordsCountProps) {
  return (
    <div className="text-xs text-muted-foreground">
      Showing{" "}
      <strong>
        1 to {count}
      </strong>{" "}
      of
      <strong> {total}</strong> {label}
    </div>
  );
}
