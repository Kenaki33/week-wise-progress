// ============================================================
// Jeden Nawyk - zakladka Tydzien (z nawigacja tygodniami / historia)
// Biezacy tydzien: edytowalny (siatka ✓/✕, punktacja, werdykt, utrzymanie).
// Tygodnie wstecz: podglad - ile punktow i co bylo sledzone.
// ============================================================

import { useState, useEffect, type CSSProperties } from "react";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveHabitId, setActiveHabitId, getWeek, getHabitHistory,
  getMastered, upsertWeek, upsertMastered, type MasteredRow,
} from "@/lib/jeden-nawyk/db";
import { getHabit, getPath, getPathOfHabit, type PoolHabit } from "@/lib/jeden-nawyk/habitPool";
import {
  DAY, liveWeekScore, weekVerdict, weekPassed, doneCount, isUnlocked,
} from "@/lib/jeden-nawyk/scoring";
import { weekKey, weekStart, scoringTodayIndex, DAY_LABELS, MONTHS_LONG } from "@/lib/jeden-nawyk/dates";

const G = {
  bg: "#fdfcf8", bgWarm: "#f7f3e8", ink: "#1a1a1a", gold: "#d4a72c",
  goldDeep: "#b88a1c", muted: "#888780", border: "#ebe8de", green: "#2a7a3b", red: "#c33", silver: "#9a9a9a",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const eyebrow: CSSProperties = { fontSize: 10, letterSpacing: "0.28em", color: G.goldDeep, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 };

interface MaintItem { habit: PoolHabit; pathName: string; days: number[]; source: "earned" | "declared"; }
interface HistRow { name: string; days: number[]; weeklyTarget: number; score: number; isMaintenance: boolean; }

function weekRangeLabel(date: Date): string {
  const s = weekStart(date);
  const e = new Date(s); e.setDate(e.getDate() + 6);
  if (s.getMonth() === e.getMonth()) return `${s.getDate()}-${e.getDate()} ${MONTHS_LONG[e.getMonth()]}`;
  return `${s.getDate()} ${MONTHS_LONG[s.getMonth()]} - ${e.getDate()} ${MONTHS_LONG[e.getMonth()]}`;
}

export default function Tydzien({ active }: { active: boolean }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [habit, setHabit] = useState<PoolHabit | null>(null);
  const [pathName, setPathName] = useState("");
  const [days, setDays] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [unlocked, setUnlocked] = useState(false);
  const [maint, setMaint] = useState<MaintItem[]>([]);
  const [hist, setHist] = useState<HistRow[]>([]);
  const [busy, setBusy] = useState(false);

  const isCurrent = weekOffset === 0;
  const viewedDate = (() => { const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); return d; })();
  const curWk = weekKey(new Date());
  const todayIdx = scoringTodayIndex(new Date());

  const load = async () => {
    try {
      const vd = new Date(); vd.setDate(vd.getDate() + weekOffset * 7);
      const vWk = weekKey(vd);
      const vTi = scoringTodayIndex(vd);
      const weekRows = await getWeek(vWk);

      if (weekOffset === 0) {
        const id = await getActiveHabitId();
        const mastered = await getMastered();
        setActiveId(id);
        if (id) {
          const h = getHabit(id) ?? null;
          const p = getPathOfHabit(id);
          setHabit(h); setPathName(p?.name ?? "");
          const row = weekRows.find((r) => r.habitPoolId === id && !r.isMaintenance);
          setDays(row?.days ?? [0, 0, 0, 0, 0, 0, 0]);
          if (h) {
            const histRows = await getHabitHistory(id);
            const flags = histRows
              .filter((r) => !r.isMaintenance && r.weekKey !== vWk)
              .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
              .map((r) => weekPassed(doneCount(r.days), r.weeklyTarget));
            setUnlocked(flags.length > 0 && isUnlocked(h.weeklyTarget, flags));
          } else setUnlocked(false);
        } else { setHabit(null); setUnlocked(false); }

        const items: MaintItem[] = [];
        mastered.forEach((m: MasteredRow) => {
          const p = getPath(m.pathId);
          const h = p?.habits[m.levelIdx];
          if (!p || !h || h.id === id) return;
          const row = weekRows.find((r) => r.habitPoolId === h.id && r.isMaintenance);
          items.push({ habit: h, pathName: p.name, days: row?.days ?? [0, 0, 0, 0, 0, 0, 0], source: m.source });
        });
        setMaint(items);
      } else {
        const rows: HistRow[] = weekRows.map((r) => {
          let sc = liveWeekScore({ days: r.days as (0 | 1 | 2)[], weeklyTarget: r.weeklyTarget, todayIndex: vTi });
          if (r.isMaintenance) sc = Math.round(sc / 3);
          const text = r.habitName || getHabit(r.habitPoolId ?? "")?.text || "Nawyk";
          return { name: text, days: r.days, weeklyTarget: r.weeklyTarget, score: sc, isMaintenance: r.isMaintenance };
        });
        rows.sort((a, b) => Number(a.isMaintenance) - Number(b.isMaintenance));
        setHist(rows);
      }
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się wczytać tygodnia.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (active || loading) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [active, weekOffset]);

  const saveMain = async (newDays: number[]) => {
    if (!habit || !activeId) return;
    setDays(newDays);
    const done = doneCount(newDays);
    const score = liveWeekScore({ days: newDays as (0 | 1 | 2)[], weeklyTarget: habit.weeklyTarget, todayIndex: todayIdx });
    const passed = todayIdx >= 7 ? weekPassed(done, habit.weeklyTarget) : null;
    try {
      await upsertWeek({
        weekKey: curWk, habitPoolId: activeId, habitName: habit.text, days: newDays,
        weeklyTarget: habit.weeklyTarget, weeklyScore: score, passed,
        isMaintenance: false, isCustom: false, reflection: null,
      });
    } catch (e) { console.error(e); toast.error("Nie zapisano. Spróbuj ponownie."); }
  };

  const saveMaint = async (item: MaintItem, newDays: number[]) => {
    setMaint((prev) => prev.map((m) => (m.habit.id === item.habit.id ? { ...m, days: newDays } : m)));
    try {
      await upsertWeek({
        weekKey: curWk, habitPoolId: item.habit.id, habitName: item.habit.text, days: newDays,
        weeklyTarget: item.habit.weeklyTarget, weeklyScore: null, passed: null,
        isMaintenance: true, isCustom: false, reflection: null,
      });
    } catch (e) { console.error(e); toast.error("Nie zapisano utrzymania."); }
  };

  const toggleDay = (setter: (d: number[]) => void, current: number[], i: number, target: 1 | 2) => {
    const copy = [...current];
    copy[i] = copy[i] === target ? DAY.EMPTY : target;
    setter(copy);
  };
  const toggleFreq = (setter: (d: number[]) => void, current: number[], i: number) => {
    const copy = [...current];
    copy[i] = copy[i] === DAY.DONE ? DAY.EMPTY : DAY.DONE;
    setter(copy);
  };

  const completeHabit = async () => {
    if (!habit || !activeId || busy) return;
    const p = getPathOfHabit(activeId);
    if (!p) return;
    const stepIdx = p.habits.findIndex((h) => h.id === activeId);
    setBusy(true);
    try {
      await upsertMastered(p.id, stepIdx, "earned");
      const next = p.habits[stepIdx + 1];
      if (next) {
        await setActiveHabitId(next.id);
        await upsertWeek({
          weekKey: curWk, habitPoolId: next.id, habitName: next.text, days: [0, 0, 0, 0, 0, 0, 0],
          weeklyTarget: next.weeklyTarget, weeklyScore: null, passed: null,
          isMaintenance: false, isCustom: false, reflection: null,
        });
        toast.success("Opanowane! Odblokowano kolejny krok w ścieżce.");
      } else {
        await setActiveHabitId(null);
        toast.success("Ukończyłeś całą ścieżkę! Wybierz nową w zakładce Nawyki.");
      }
      await load();
    } catch (e) { console.error(e); toast.error("Nie udało się zapisać."); }
    finally { setBusy(false); }
  };

  // NAWIGACJA TYGODNI
  const nav = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
      <button onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Poprzedni tydzień"
        style={{ background: "transparent", border: `1px solid ${G.ink}`, color: G.ink, borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <ChevronLeft size={17} />
      </button>
      <div style={{ textAlign: "center", lineHeight: 1.3 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: G.muted }}>
          {isCurrent ? "Ten tydzień" : "Tydzień"}
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600 }}>{weekRangeLabel(viewedDate)}</div>
      </div>
      <button onClick={() => weekOffset < 0 && setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 0} aria-label="Następny tydzień"
        style={{ background: "transparent", border: `1px solid ${weekOffset < 0 ? G.ink : G.border}`, color: weekOffset < 0 ? G.ink : G.border, borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: weekOffset < 0 ? "pointer" : "not-allowed", flexShrink: 0 }}>
        <ChevronRight size={17} />
      </button>
    </div>
  );

  if (loading) {
    return <div>{nav}<div style={{ fontFamily: SERIF, fontStyle: "italic", color: G.muted, textAlign: "center", padding: "40px 0" }}>Wczytywanie...</div></div>;
  }

  // WIDOK HISTORYCZNY
  if (!isCurrent) {
    const weekTotal = hist.reduce((s, r) => s + r.score, 0);
    return (
      <div>
        {nav}
        {hist.length === 0 ? (
          <div style={{ border: `1px solid ${G.border}`, background: G.bgWarm, padding: "30px 22px", textAlign: "center" }}>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Pusty tydzień</div>
            <div style={{ fontSize: 14, color: G.muted }}>W tym tygodniu nic nie było śledzone.</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", padding: "16px 0", borderTop: `1px solid ${G.ink}`, borderBottom: `1px solid ${G.ink}`, marginBottom: 18 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: G.muted, marginBottom: 4 }}>Punkty w tym tygodniu</div>
              <div style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 700, lineHeight: 1, color: weekTotal >= 0 ? G.ink : G.red }}>{weekTotal >= 0 ? "+" : ""}{weekTotal}</div>
            </div>
            {hist.map((r, idx) => (
              <div key={idx} style={{ borderTop: `1px solid ${G.border}`, padding: "14px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: G.ink, lineHeight: 1.35 }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{r.isMaintenance ? "utrzymanie · 1/3 stawki" : "nawyk główny"}</div>
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: r.score >= 0 ? G.green : G.red, flexShrink: 0 }}>{r.score >= 0 ? "+" : ""}{r.score}</div>
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {DAY_LABELS.map((lab, i) => {
                    const st = r.days[i];
                    const bg = st === DAY.DONE ? G.green : st === DAY.SKIP ? G.red : G.border;
                    return <div key={i} style={{ flex: 1, aspectRatio: "1/1", borderRadius: 3, background: bg }} title={lab} />;
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // WIDOK BIEZACY - brak aktywnego nawyku
  if (!habit) {
    return (
      <div>
        {nav}
        <div style={{ border: `1px solid ${G.border}`, background: G.bgWarm, padding: "30px 22px", textAlign: "center" }}>
          <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, marginBottom: 10 }}>Nie masz aktywnego nawyku</div>
          <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.5 }}>Przejdź do zakładki <strong>Nawyki</strong> i wybierz, nad czym chcesz teraz pracować.</div>
        </div>
        {maint.length > 0 && <Maintenance maint={maint} todayIdx={todayIdx} onTick={saveMaint} />}
      </div>
    );
  }

  // WIDOK BIEZACY - aktywny nawyk
  const isDaily = habit.weeklyTarget === 7;
  const done = doneCount(days);
  const ratio = Math.min(done, habit.weeklyTarget) / habit.weeklyTarget;
  const score = liveWeekScore({ days: days as (0 | 1 | 2)[], weeklyTarget: habit.weeklyTarget, todayIndex: todayIdx });
  const verdict = weekVerdict({ days: days as (0 | 1 | 2)[], weeklyTarget: habit.weeklyTarget, todayIndex: todayIdx });

  return (
    <div>
      {nav}
      <div style={{ ...eyebrow, marginBottom: 6 }}>{pathName}</div>
      <div style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>{habit.text}</div>
      <div style={{ fontSize: 12, color: G.muted, marginBottom: 18 }}>
        Cel: {habit.weeklyTarget === 7 ? "codziennie" : `${habit.weeklyTarget}× w tygodniu`}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {DAY_LABELS.map((lab, i) => {
          const st = days[i];
          const fut = i > todayIdx;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, color: i === todayIdx ? G.ink : G.muted, fontWeight: i === todayIdx ? 700 : 400 }}>{lab}</span>
              {isDaily ? (
                <>
                  <button onClick={() => !fut && toggleDay((d) => saveMain(d), days, i, 1)} disabled={fut}
                    style={{ width: "100%", aspectRatio: "1/1", border: "none", borderRadius: 5, cursor: fut ? "not-allowed" : "pointer", opacity: fut ? 0.4 : 1, background: st === DAY.DONE ? G.green : G.bgWarm, color: st === DAY.DONE ? "#fff" : G.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <button onClick={() => !fut && toggleDay((d) => saveMain(d), days, i, 2)} disabled={fut}
                    style={{ width: "100%", aspectRatio: "1/1", border: "none", borderRadius: 5, cursor: fut ? "not-allowed" : "pointer", opacity: fut ? 0.4 : 1, background: st === DAY.SKIP ? G.red : G.bgWarm, color: st === DAY.SKIP ? "#fff" : G.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={14} strokeWidth={3} />
                  </button>
                </>
              ) : (
                <button onClick={() => !fut && toggleFreq((d) => saveMain(d), days, i)} disabled={fut}
                  style={{ width: "100%", aspectRatio: "1/1.6", border: "none", borderRadius: 5, cursor: fut ? "not-allowed" : "pointer", opacity: fut ? 0.4 : 1, background: st === DAY.DONE ? G.gold : G.bgWarm, color: st === DAY.DONE ? G.ink : G.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {st === DAY.DONE ? <Check size={16} strokeWidth={3} /> : ""}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `1px solid ${G.border}`, borderBottom: `1px solid ${G.border}`, padding: "14px 0", marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{score >= 0 ? "+" : ""}{score}</div>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: G.muted, marginTop: 4 }}>punkty · {done}/{habit.weeklyTarget}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          {verdict === "full" && <div style={{ fontSize: 12, color: G.green, fontWeight: 700 }}>✓ pełny cel · +77</div>}
          {verdict === "passed" && <div style={{ fontSize: 12, color: G.green, fontWeight: 700 }}>✓ tydzień zaliczony</div>}
          {verdict === "failed" && <div style={{ fontSize: 11, color: G.red }}>{Math.round(ratio * 100)}% · niezaliczony</div>}
          {verdict === "in-progress" && <div style={{ fontSize: 11, color: G.muted }}>{Math.round(ratio * 100)}% celu</div>}
        </div>
      </div>
      <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.5, marginBottom: 22 }}>
        {isDaily
          ? "✓ dodaje, ✕ odejmuje. Puste pole jest neutralne dopóki dzień trwa. Czy tydzień zaliczony (próg 67%) zobaczysz po jego zamknięciu."
          : "Liczy się liczba wykonań w tygodniu. Niedobór odejmie punkty po zamknięciu tygodnia."}
      </div>

      {unlocked && (
        <div style={{ background: G.ink, color: G.bg, padding: "20px 20px", marginBottom: 22 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", color: G.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Gotowe</div>
          <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, lineHeight: 1.35, marginBottom: 16 }}>Ten nawyk wszedł Ci w krew. Możesz odblokować kolejny krok.</div>
          <button onClick={completeHabit} disabled={busy}
            style={{ width: "100%", background: G.gold, color: G.ink, border: "none", padding: 14, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: SANS }}>
            {busy ? "Zapisuję..." : "Oznacz jako opanowany"}
          </button>
        </div>
      )}

      {maint.length > 0 && <Maintenance maint={maint} todayIdx={todayIdx} onTick={saveMaint} />}
    </div>
  );
}

function Maintenance({ maint, todayIdx, onTick }: { maint: MaintItem[]; todayIdx: number; onTick: (item: MaintItem, days: number[]) => void }) {
  const ti = todayIdx >= 7 ? 6 : todayIdx;
  const setToday = (item: MaintItem, target: 1 | 2) => {
    const copy = [...item.days];
    copy[ti] = copy[ti] === target ? DAY.EMPTY : target;
    onTick(item, copy);
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div style={eyebrow}>Utrzymanie</div>
      <div style={{ fontSize: 11, color: G.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Opanowane nawyki - zaznacz, czy dziś je trzymasz. Punkty liczą się na 1/3 stawki.
      </div>
      {maint.map((m) => {
        const st = m.days[ti];
        return (
          <div key={m.habit.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `1px solid ${G.border}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: G.ink, lineHeight: 1.35 }}>{m.habit.text}</div>
              <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>
                {m.pathName}{m.source === "declared" ? " · opanowany z marszu" : ""}
              </div>
            </div>
            <button onClick={() => setToday(m, 1)} aria-label="Zrobione"
              style={{ width: 34, height: 34, borderRadius: 6, border: "none", cursor: "pointer", background: st === DAY.DONE ? G.green : G.bgWarm, color: st === DAY.DONE ? "#fff" : G.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check size={15} strokeWidth={3} />
            </button>
            <button onClick={() => setToday(m, 2)} aria-label="Nie zrobione"
              style={{ width: 34, height: 34, borderRadius: 6, border: "none", cursor: "pointer", background: st === DAY.SKIP ? G.red : G.bgWarm, color: st === DAY.SKIP ? "#fff" : G.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <X size={15} strokeWidth={3} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
