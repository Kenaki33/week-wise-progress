// ============================================================
// Jeden Nawyk - funkcje tygodnia
// Spojne z pierwsza wersja apki: format week_key "YYYY-WW" bez zmian.
// ============================================================

export const DAY_LABELS = ["pon", "wt", "śr", "cz", "pt", "sb", "nd"] as const;
export const MONTHS_LONG = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
] as const;
export const MONTHS_NOM = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
] as const;

/** Poniedziałek tygodnia danej daty (00:00). */
export function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Klucz tygodnia "YYYY-WW" (jak w pierwszej wersji). */
export function weekKey(date: Date): string {
  const d = weekStart(date);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const w = Math.ceil((((d.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(w).padStart(2, "0")}`;
}

/** Odtwarza poniedziałek tygodnia z klucza "YYYY-WW". */
export function weekStartFromKey(key: string): Date {
  const [y, w] = key.split("-").map(Number);
  const jan1 = new Date(y, 0, 1);
  const mon = new Date(jan1.getTime() + (w - 1) * 7 * 86400000);
  mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

/** Daty 7 dni tygodnia (pon..nd) dla podanej daty. */
export function weekDates(date: Date): Date[] {
  const ws = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * Indeks dnia dla punktacji (zgodny ze scoring.ts):
 * 0-6 = biezacy dzien tygodnia, 7 = tydzien zamkniety, 0 dla tygodnia w przyszlosci.
 */
export function scoringTodayIndex(date: Date, now: Date = new Date()): number {
  const ws = weekStart(date);
  const nextMon = new Date(ws);
  nextMon.setDate(nextMon.getDate() + 7);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  if (n.getTime() >= nextMon.getTime()) return 7;
  if (n.getTime() < ws.getTime()) return 0;
  return Math.floor((n.getTime() - ws.getTime()) / 86400000);
}
