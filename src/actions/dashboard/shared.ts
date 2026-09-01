export const roundToTenth = (hours: number) => Math.round(hours * 10) / 10;

// Local-time day range: start at 00:00 daysBack days ago, end today 23:59:59.999
export const getLocalDayRange = (
  daysBack: number,
): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysBack,
    0,
    0,
    0,
    0,
  );
  return { start, end };
};
