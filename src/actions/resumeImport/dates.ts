// Locale-independent date helpers for resume import. Month names come from
// Intl rather than a hand-written French/German/... list, so any locale the
// runtime's ICU knows works without code changes.

const MONTH_LOCALES = [
  "en", "fr", "es", "de", "pt", "it", "nl", "sv", "da", "nb", "fi", "pl",
  "cs", "sk", "ro", "hu", "tr", "ru", "uk", "el", "ca", "id", "vi",
];

// Words that mean "still ongoing" in end-date position. Matched after
// lowercasing and stripping diacritics and trailing punctuation.
const PRESENT_WORDS = new Set([
  "present", "current", "now", "ongoing", "today", "-",
  "presente", "actuel", "actuelle", "actuellement", "aujourd'hui", "en cours",
  "heute", "aktuell", "gegenwart", "laufend", "jetzt",
  "actualidad", "actualmente", "actual", "hoy", "atualmente", "atual", "hoje",
  "attuale", "attualmente", "oggi", "in corso",
  "heden", "nu", "huidig", "nuvarande", "nutid", "nåværende", "nykyinen",
  "obecnie", "dzis", "teraz", "soucasnost", "prezent", "actualmente",
  "halen", "su anda", "devam ediyor", "в настоящее время", "настоящее время",
  "по настоящее время", "наст. время", "сейчас", "теперь",
  "現在", "至今", "今", "현재", "재직중", "الحالي", "حتى الآن",
]);

const PARTICLES = new Set(["de", "del", "of", "d", "di", "van", "von", "em", "en", "a", "in"]);

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,]+$/g, "")
    .trim();
}

let monthMap: Map<string, number> | null = null;

function getMonthMap(): Map<string, number> {
  if (monthMap) return monthMap;
  const seen = new Map<string, number>();
  const ambiguous = new Set<string>();
  for (const loc of MONTH_LOCALES) {
    for (const style of ["long", "short"] as const) {
      let fmt: Intl.DateTimeFormat;
      try {
        fmt = new Intl.DateTimeFormat(loc, { month: style, timeZone: "UTC" });
      } catch {
        continue;
      }
      for (let m = 0; m < 12; m++) {
        const name = fold(fmt.format(new Date(Date.UTC(2020, m, 1)))).replace(/\./g, "");
        if (!/^\p{L}{3,}$/u.test(name)) continue;
        const prev = seen.get(name);
        if (prev !== undefined && prev !== m) ambiguous.add(name);
        else seen.set(name, m);
      }
    }
  }
  for (const a of ambiguous) seen.delete(a);
  monthMap = seen;
  return seen;
}

export function isPresentMarker(s: string): boolean {
  const t = fold(s);
  return PRESENT_WORDS.has(t) || PRESENT_WORDS.has(s.trim().toLowerCase());
}

// "janvier 2020", "Januar 2020", "enero de 2020", "ene. 2020", "2020年1月"
export function parseNamedMonthYear(s: string): Date | null {
  const cjk = /^(\d{4})\s*[年.]\s*(\d{1,2})\s*月?$/.exec(s.trim());
  if (cjk) return new Date(+cjk[1], +cjk[2] - 1, 1);

  const year = /(?<!\d)(\d{4})(?!\d)/.exec(s);
  if (!year) return null;
  const words = fold(s.replace(year[1], " "))
    .split(/[^\p{L}]+/u)
    .filter((w) => w && !PARTICLES.has(w));
  if (words.length !== 1) return null;
  const month = getMonthMap().get(words[0]);
  return month === undefined ? null : new Date(+year[1], month, 1);
}
