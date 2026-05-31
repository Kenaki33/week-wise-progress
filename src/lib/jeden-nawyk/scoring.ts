// ============================================================
// Jeden Nawyk - logika punktacji (źródło prawdy)
// Skala: od -70 do +70, +7 bonusu za 100% => max +77
// ============================================================

const SCALE = 70;
const FULL_BONUS = 7;
const PASS_THRESHOLD = 2 / 3; // 67% = tydzień zaliczony (odblokowuje kolejny nawyk)

// Stany dnia
export const DAY = { EMPTY: 0, DONE: 1, SKIP: 2 } as const;
export type DayState = 0 | 1 | 2;

// todayIndex: 0..6 = bieżący dzień tygodnia (pon..nd), 7 = tydzień zamknięty
export interface WeekInput {
  days: DayState[];      // 7 stanów
  weeklyTarget: number;  // T (1..7)
  todayIndex: number;    // 0..7
}

export function doneCount(days: DayState[]): number {
  return days.filter((d) => d === DAY.DONE).length;
}

/**
 * Finalny wynik tygodnia (po zamknięciu, do rankingu/historii).
 * (wykonane / T × 140) − 70, capowane na 100%, +7 jeśli pełny cel.
 * Na koniec tygodnia każdy niewykonany dzień (✕ lub puste) liczy się jako miss.
 */
export function finalWeekScore(done: number, weeklyTarget: number): number {
  const ratio = Math.min(done, weeklyTarget) / weeklyTarget;
  let s = ratio * (SCALE * 2) - SCALE;
  if (done >= weeklyTarget) s += FULL_BONUS;
  return Math.round(s);
}

/**
 * Wynik na żywo (w trakcie tygodnia).
 * Codzienny (T=7): ✓ dodaje, ✕ odejmuje od razu, puste jest neutralne
 *   dopóki dzień nie minął (i < todayIndex => puste liczy się jako miss).
 * Częstotliwościowy (T<7): liczy się liczba wykonań; niedobór odejmuje
 *   dopiero po zamknięciu tygodnia (todayIndex >= 7).
 * Nadwyżka nie nabija punktów (cap na T).
 */
export function liveWeekScore({ days, weeklyTarget, todayIndex }: WeekInput): number {
  const done = doneCount(days);
  const dayW = SCALE / weeklyTarget;
  let raw = 0;

  if (weeklyTarget === 7) {
    days.forEach((s, i) => {
      if (s === DAY.DONE) raw += dayW;
      else if (s === DAY.SKIP) raw -= dayW;
      else if (i < todayIndex) raw -= dayW; // puste, dzień już minął
    });
  } else {
    raw = Math.min(done, weeklyTarget) * dayW;
    if (todayIndex >= 7 && done < weeklyTarget) raw -= (weeklyTarget - done) * dayW;
  }

  return Math.round(raw) + (done >= weeklyTarget ? FULL_BONUS : 0);
}

/** Czy tydzień zaliczony (próg odblokowania kolejnego nawyku). Oceniaj po zamknięciu. */
export function weekPassed(done: number, weeklyTarget: number): boolean {
  return done / weeklyTarget >= PASS_THRESHOLD - 1e-9;
}

/**
 * Status werdyktu do UI. Pełny cel pokazujemy od razu; próg 67% i niedobór
 * DOPIERO po zamknięciu tygodnia (todayIndex >= 7), żeby nie odpuszczać w środku.
 */
export type WeekVerdict = "in-progress" | "full" | "passed" | "failed";
export function weekVerdict({ days, weeklyTarget, todayIndex }: WeekInput): WeekVerdict {
  const done = doneCount(days);
  if (done >= weeklyTarget) return "full";
  if (todayIndex < 7) return "in-progress";
  return weekPassed(done, weeklyTarget) ? "passed" : "failed";
}

/** Punkty utrzymaniowe = 1/3 stawki nawyku głównego. */
export function maintenanceScore(done: number, weeklyTarget: number): number {
  return Math.round(finalWeekScore(done, weeklyTarget) / 3);
}

// ============================================================
// Odblokowanie kolejnego nawyku w ścieżce (spec sekcja 4)
// Codzienny (T=7): 1 zaliczony tydzień.
// Częstotliwościowy (T<7): 3 zaliczone tygodnie w oknie 4 (1 grace).
// ============================================================
/**
 * @param passedFlags - tablica boolean "czy tydzień zaliczony" dla ostatnich tygodni
 *   (najnowszy na końcu).
 */
export function isUnlocked(weeklyTarget: number, passedFlags: boolean[]): boolean {
  if (weeklyTarget === 7) {
    return passedFlags.slice(-1)[0] === true; // ostatni tydzień zaliczony
  }
  const window = passedFlags.slice(-4); // okno 4 tygodni
  const passed = window.filter(Boolean).length;
  return passed >= 3;
}

// ============================================================
// Granica miesięcy (ranking zeruje się 1. dnia miesiąca)
// Tydzień należy do miesiąca, w którym wypada jego OSTATNI dzień (niedziela).
// Cały wynik tygodnia, raz, do jednego miesiąca - bez dublowania.
// Spójne z tym, że wynik tygodnia materializuje się przy zamknięciu (w niedzielę).
// ============================================================

/** Klucz miesiąca "YYYY-MM" dla tygodnia. Przyjmuje poniedziałek tygodnia. */
export function weekMonthKey(weekStart: Date): string {
  const sun = new Date(weekStart);
  sun.setDate(sun.getDate() + 6); // niedziela
  return `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, "0")}`;
}

export interface ScoredWeek {
  weekStart: Date; // poniedziałek tygodnia
  score: number;   // wynik tygodnia (finalWeekScore lub maintenanceScore)
}

/** Suma punktów z danego miesiąca = tygodnie, których niedziela wypada w tym miesiącu. */
export function monthlyTotal(weeks: ScoredWeek[], monthKey: string): number {
  return weeks
    .filter((w) => weekMonthKey(w.weekStart) === monthKey)
    .reduce((sum, w) => sum + w.score, 0);
}
