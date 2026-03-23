"use client";

import { useTranslations } from "@/i18n";

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
  const { t } = useTranslations();

  const text = t("common.showingRecords")
    .replace("{count}", String(count))
    .replace("{total}", String(total))
    .replace("{label}", label);

  return (
    <div className="text-xs text-muted-foreground">
      {text}
    </div>
  );
}
