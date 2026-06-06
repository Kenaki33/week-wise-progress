// ============================================================
// Jeden Nawyk - zakladka Tydzien
// Aktualny nawyk glowny: siatka ✓/✕, punktacja na zywo, werdykt po zamknieciu.
// Pod spodem warstwa Utrzymanie (opanowane nawyki, ✓/✕ na dzis, 1/3 stawki).
// ============================================================

import { useState, useEffect, type CSSProperties } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveHabitId, setActiveHabitId, getWeek, getHabitHistory,
  getMastered, upsertWeek, upsertMastered, type MasteredRow,
} from "@/lib/jeden-nawyk/db";
import { getHabit, getPath, getPathOfHabit, type PoolHabit } from "@/lib/jeden-nawyk/habitPool";
import {
  DAY, liveWeekScore, weekVerdict, weekPassed, doneCount, isUnlocked,
} from "@/lib/jeden-nawyk/scoring";
import { weekKey, scoringTodayIndex, DAY_LABELS } from "@/lib/jeden-nawyk/dates";

const G = {
  bg: "#fdfcf8", bgWarm: "#f7f3e8", ink: "#1a1a1a", gold: "#d4a72c",
  goldDeep: "#b88a1c", muted: "#888780", border: "#ebe8de", green: "#2a7a3b", red: "#c33", silver: "#9a9a9a",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const eyebrow: CSSProperties = { fontSize: 10, letterSpacing: "0.28em", color: G.goldDeep, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 };

interface MaintItem { habit: PoolHabit; pathName: string; days: number[]; source: "earned" | "declared"; }

export default function Tydzien({ onChanged }: { onChanged?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [habit, setHabit] = useState<PoolHabit | null>(null);
  const [pathName, setPathName] = useState("");
  const [days, setDays] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [unlocked, setUnlocked] = useState(false);
  const [maint, setMaint] = useState<MaintItem[]>([]);
  const [busy, setBusy] = useState(false);

  const wk = weekKey(new Date());
  const todayIdx = scoringTodayIndex(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const id = await getActiveHabitId();
      const weekRows = await getWeek(wk);
      const mastered = await getMastered();
      setActiveId(id);

      if (id) {
        const h = getHabit(id) ?? null;
        const p = getPathOfHabit(id);
        setHabit(h);
        setPathName(p?.name ?? "");
        const row = weekRows.find((r) => r.habitPoolId === id && !r.isMaintenance);
        setDays(row?.days ?? [0, 0, 0, 0, 0, 0, 0]);

        if (h) {
          const hist = await getHabitHistory(id);
          const flags = hist
            .filter((r) => !r.isMaintenance && r.weekKey !== wk)
            .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
            .map((r) => weekPassed(doneCount(r.days), r.weeklyTarget));
          setUnlocked(flags.length > 0 && isUnlocked(h.weeklyTarget, flags));
        } else {
          setUnlocked(false);
        }
      } else {
        setHabit(null);
        setUnlocked(false);
      }

      // Utrzymanie: dla kazdej opanowanej sciezki nawyk na poziomie level_idx (poza aktywnym)
      const items: MaintItem[] = [];
      mastered.forEach((m: MasteredRow) => {
        const p = getPath(m.pathId);
        const h = p?.habits[m.levelIdx];
        if (!p || !h || h.id === id) return;
        const row = weekRows.find((r) => r.habitPoolId === h.id && r.isMaintenance);
        items.push({ habit: h, pathName: p.name, days: row?.days ?? [0, 0, 0, 0, 0, 0, 0], source: m.source });
      });
      setMaint(items);
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się wczytać tygodnia.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const saveMain = async (newDays: number[]) => {
    if (!habit || !activeId) return;
    setDays(newDays);
    const done = doneCount(newDays);
    const score = liveWeekScore({ days: newDays as (0 | 1 | 2)[], weeklyTarget: habit.weeklyTarget, todayIndex: todayIdx });
    const passed = todayIdx >= 7 ? weekPassed(done, habit.weeklyTarget) : null;
    try {
      await upsertWeek({
        weekKey: wk, habitPoolId: activeId, habitName: habit.text, days: newDays,
        weeklyTarget: habit.weeklyTarget, weeklyScore: score, passed,
        isMaintenance: false, isCustom: false, reflection: null,
      });
    } catch (e) { console.error(e); toast.error("Nie zapisano. Spróbuj ponownie."); }
  };

  const saveMaint = async (item: MaintItem, newDays: number[]) => {
    setMaint((prev) => prev.map((m) => (m.habit.id === item.habit.id ? { ...m, days: newDays } : m)));
    try {
      await upsertWeek({
        weekKey: wk, habitPoolId: item.habit.id, habitName: item.habit.text, days: newDays,
        weeklyTarget: item.habit.weeklyTarget, weeklyScore: null, passed: null,
        isMaintenance: true, isCustom: false, reflection: null,
      });
    } catch (e) { console.error(e); toast.error("Nie zapisano utrzymania."); }
  };

  // Toggle dnia dla nawyku codziennego (T=7): ✓ lub ✕
  const toggleDay = (newDaysSetter: (d: number[]) => void, current: number[], i: number, target: 1 | 2) => {
    const copy = [...current];
    copy[i] = copy[i] === target ? DAY.EMPTY : target;
    newDaysSetter(copy);
  };
  // Toggle dla czestotliwosciowego (T<7): tylko ✓
  const toggleFreq = (newDaysSetter: (d: number[]) => void, current: number[], i: number) => {
    const copy = [...current];
    copy[i] = copy[i] === DAY.DONE ? DAY.EMPTY : DAY.DONE;
    newDaysSetter(copy);
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
          weekKey: wk, habitPoolId: next.id, habitName: next.text, days: [0, 0, 0, 0, 0, 0, 0],
          weeklyTarget: next.weeklyTarget, weeklyScore: null, passed: null,
          isMaintenance: false, isCustom: false, reflection: null,
        });
        toast.success("Opanowane! Odblokowano kolejny krok w ścieżce.");
      } else {
        await setActiveHabitId(null);
        toast.success("Ukończyłeś całą ścieżkę! Wybierz nową w zakładce Nawyki.");
      }
      onChanged?.();
      await load();
    } catch (e) { console.error(e); toast.error("Nie udało się zapisać."); }
    finally { setBusy(false); }
  };

  if (loading) return <div style={{ fontFamily: SERIF, fontStyle: "italic", color: G.muted, textAlign: "center", padding: "40px 0" }}>Wczytywanie...</div>;

  // Brak aktywnego nawyku
  if (!habit) return (
    <div>
      <div style={eyebrow}>Tydzień</div>
      <div style={{ border: `1px solid ${G.border}`, background: G.bgWarm, padding: "30px 22px", textAlign: "center" }}>
        <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, marginBottom: 10 }}>Nie masz aktywnego nawyku</div>
        <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.5 }}>Przejdź do zakładki <strong>Nawyki</strong> i wybierz, nad czym chcesz teraz pracować.</div>
      </div>
      {maint.length > 0 && <Maintenance maint={maint} todayIdx={todayIdx} onTick={saveMaint} />}
    </div>
  );

  const isDaily = habit.weeklyTarget === 7;
  const done = doneCount(days);
  const ratio = Math.min(done, habit.weeklyTarget) / habit.weeklyTarget;
  const score = liveWeekScore({ days: days as (0 | 1 | 2)[], weeklyTarget: habit.weeklyTarget, todayIndex: todayIdx });
  const verdict = weekVerdict({ days: days as (0 | 1 | 2)[], weeklyTarget: habit.weeklyTarget, todayIndex: todayIdx });

  return (
    <div>
      <div style={eyebrow}>Tydzień · {pathName}</div>
      <div style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>{habit.text}</div>
      <div style={{ fontSize: 12, color: G.muted, marginBottom: 18 }}>
        Cel: {habit.weeklyTarget === 7 ? "codziennie" : `${habit.weeklyTarget}× w tygodniu`}
      </div>

      {/* SIATKA DNI */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {DAY_LABELS.map((lab, i) => {
          const st = days[i];
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, color: i === todayIdx ? G.ink : G.muted, fontWeight: i === todayIdx ? 700 : 400 }}>{lab}</span>
              {isDaily ? (
                <>
                  <button onClick={() => toggleDay((d) => saveMain(d), days, i, 1)}
                    style={{ width: "100%", aspectRatio: "1/1", border: "none", borderRadius: 5, cursor: "pointer", background: st === DAY.DONE ? G.green : G.bgWarm, color: st === DAY.DONE ? "#fff" : G.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <button onClick={() => toggleDay((d) => saveMain(d), days, i, 2)}
                    style={{ width: "100%", aspectRatio: "1/1", border: "none", borderRadius: 5, cursor: "pointer", background: st === DAY.SKIP ? G.red : G.bgWarm, color: st === DAY.SKIP ? "#fff" : G.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={14} strokeWidth={3} />
                  </button>
                </>
              ) : (
                <button onClick={() => toggleFreq((d) => saveMain(d), days, i)}
                  style={{ width: "100%", aspectRatio: "1/1.6", border: "none", borderRadius: 5, cursor: "pointer", background: st === DAY.DONE ? G.gold : G.bgWarm, color: st === DAY.DONE ? G.ink : G.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {st === DAY.DONE ? <Check size={16} strokeWidth={3} /> : ""}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* PUNKTACJA + WERDYKT */}
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

      {/* CTA OPANOWANIA */}
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
  const ti = todayIdx >= 7 ? 6 : todayIdx; // na zamknietym tygodniu pokaz niedziele
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
