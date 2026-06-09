// ============================================================
// Jeden Nawyk - zakladka DZIS (ekran akcji)
// Po co otwieram apke dzisiaj: jeden tap na dzisiejszy nawyk,
// seria tygodni z rzedu, szybkie odhaczenie nawykow w utrzymaniu.
// Pelny obraz tygodnia jest w zakladce Tydzien.
// ============================================================

import { useState, useEffect, type CSSProperties } from "react";
import { Check, X, Flame, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveHabitId, getWeek, getMastered, upsertWeek, getMyWeeks, type MasteredRow, type WeekRow,
} from "@/lib/jeden-nawyk/db";
import { getHabit, getPath, getPathOfHabit, type PoolHabit } from "@/lib/jeden-nawyk/habitPool";
import { DAY, doneCount, weekPassed } from "@/lib/jeden-nawyk/scoring";
import { weekKey, weekStartFromKey, scoringTodayIndex, DAY_LABELS } from "@/lib/jeden-nawyk/dates";

const G = {
  bg: "#fdfcf8", bgWarm: "#f7f3e8", ink: "#1a1a1a", gold: "#d4a72c",
  goldDeep: "#b88a1c", muted: "#888780", border: "#ebe8de", green: "#2a7a3b", red: "#c33",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const eyebrow: CSSProperties = { fontSize: 10, letterSpacing: "0.28em", color: G.goldDeep, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 };

interface MaintItem { habit: PoolHabit; days: number[]; }

function computeStreak(weeks: WeekRow[]): { current: number; longest: number } {
  const passedByIdx: Record<number, boolean> = {};
  weeks.forEach((w) => {
    if (w.isMaintenance) return;
    const ws = weekStartFromKey(w.weekKey);
    if (scoringTodayIndex(ws) < 7) return; // tylko zamkniete tygodnie
    const idx = Math.round(ws.getTime() / (7 * 86400000));
    const passed = weekPassed(doneCount(w.days), w.weeklyTarget);
    passedByIdx[idx] = (passedByIdx[idx] ?? false) || passed;
  });
  const idxs = Object.keys(passedByIdx).map(Number).sort((a, b) => a - b);
  let current = 0;
  if (idxs.length) {
    let i = idxs[idxs.length - 1];
    while (passedByIdx[i] === true) { current++; i--; }
  }
  let longest = 0, run = 0, prev: number | null = null;
  idxs.forEach((i) => {
    if (passedByIdx[i]) { run = (prev !== null && i === prev + 1) ? run + 1 : 1; longest = Math.max(longest, run); }
    else { run = 0; }
    prev = i;
  });
  return { current, longest };
}

export default function Dzisiaj({ active, onGoToWeek }: { active: boolean; onGoToWeek: () => void }) {
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [habit, setHabit] = useState<PoolHabit | null>(null);
  const [pathName, setPathName] = useState("");
  const [days, setDays] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [maint, setMaint] = useState<MaintItem[]>([]);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [pop, setPop] = useState(false);

  const curWk = weekKey(new Date());
  const rawTi = scoringTodayIndex(new Date());
  const ti = rawTi >= 7 ? 6 : rawTi;
  const todayLabel = DAY_LABELS[ti];

  const load = async () => {
    try {
      const [id, mastered, weekRows, allWeeks] = await Promise.all([
        getActiveHabitId(), getMastered(), getWeek(curWk), getMyWeeks(),
      ]);
      setActiveId(id);
      if (id) {
        const h = getHabit(id) ?? null;
        const p = getPathOfHabit(id);
        setHabit(h); setPathName(p?.name ?? "");
        const row = weekRows.find((r) => r.habitPoolId === id && !r.isMaintenance);
        setDays(row?.days ?? [0, 0, 0, 0, 0, 0, 0]);
      } else { setHabit(null); setDays([0, 0, 0, 0, 0, 0, 0]); }

      const items: MaintItem[] = [];
      mastered.forEach((m: MasteredRow) => {
        const p = getPath(m.pathId);
        const h = p?.habits[m.levelIdx];
        if (!p || !h || h.id === id) return;
        const row = weekRows.find((r) => r.habitPoolId === h.id && r.isMaintenance);
        items.push({ habit: h, days: row?.days ?? [0, 0, 0, 0, 0, 0, 0] });
      });
      setMaint(items);

      const s = computeStreak(allWeeks);
      setStreak(s.current); setBest(s.longest);
    } catch (e) { console.error(e); toast.error("Nie udało się wczytać."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (active || loading) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [active]);

  const setMainToday = async (target: 1 | 2) => {
    if (!habit || !activeId) return;
    const copy = [...days];
    copy[ti] = copy[ti] === target ? DAY.EMPTY : target;
    setDays(copy);
    if (copy[ti] === DAY.DONE) { setPop(true); setTimeout(() => setPop(false), 650); }
    try {
      await upsertWeek({
        weekKey: curWk, habitPoolId: activeId, habitName: habit.text, days: copy,
        weeklyTarget: habit.weeklyTarget, weeklyScore: null, passed: null,
        isMaintenance: false, isCustom: false, reflection: null,
      });
    } catch (e) { console.error(e); toast.error("Nie zapisano."); }
  };

  const setMaintToday = async (item: MaintItem) => {
    const copy = [...item.days];
    copy[ti] = copy[ti] === DAY.DONE ? DAY.EMPTY : DAY.DONE;
    setMaint((prev) => prev.map((m) => (m.habit.id === item.habit.id ? { ...m, days: copy } : m)));
    try {
      await upsertWeek({
        weekKey: curWk, habitPoolId: item.habit.id, habitName: item.habit.text, days: copy,
        weeklyTarget: item.habit.weeklyTarget, weeklyScore: null, passed: null,
        isMaintenance: true, isCustom: false, reflection: null,
      });
    } catch (e) { console.error(e); toast.error("Nie zapisano."); }
  };

  if (loading) {
    return <div style={{ fontFamily: SERIF, fontStyle: "italic", color: G.muted, textAlign: "center", padding: "40px 0" }}>Wczytywanie...</div>;
  }

  const done = doneCount(days);
  const todayState = days[ti];
  const isDaily = habit ? habit.weeklyTarget === 7 : true;

  return (
    <div>
      <style>{"@keyframes jnPop { 0% { transform: scale(1); } 40% { transform: scale(1.16); } 100% { transform: scale(1); } }"}</style>

      {/* SERIA */}
      <div style={{ background: G.ink, color: G.bg, borderRadius: 12, padding: "16px 18px", marginBottom: 22, display: "flex", alignItems: "center", gap: 14 }}>
        <Flame size={30} color={streak > 0 ? G.gold : "rgba(253,252,248,0.4)"} strokeWidth={2} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          {streak > 0 ? (
            <>
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{streak} {streak === 1 ? "tydzień" : "tygodni"} z rzędu</div>
              <div style={{ fontSize: 11, color: "rgba(253,252,248,0.6)", marginTop: 4 }}>Rekord: {best} {best === 1 ? "tydzień" : "tygodni"}</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, lineHeight: 1.2 }}>Zbuduj swoją serię</div>
              <div style={{ fontSize: 11, color: "rgba(253,252,248,0.6)", marginTop: 4 }}>Zalicz ten tydzień, a licznik ruszy.{best > 0 ? ` Rekord: ${best}.` : ""}</div>
            </>
          )}
        </div>
      </div>

      {!habit ? (
        <div style={{ border: `1px solid ${G.border}`, background: G.bgWarm, padding: "26px 20px", textAlign: "center" }}>
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Nie masz nawyku na ten tydzień</div>
          <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.5, marginBottom: 16 }}>Wybierz nawyk, nad którym chcesz teraz pracować.</div>
          <button onClick={onGoToWeek}
            style={{ width: "100%", background: G.ink, color: G.gold, border: "none", padding: 14, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
            Wybierz nawyk
          </button>
        </div>
      ) : (
        <>
          <div style={{ ...eyebrow, marginBottom: 6 }}>Dziś · {todayLabel} · {pathName}</div>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, lineHeight: 1.25, marginBottom: 4 }}>{habit.text}</div>
          <div style={{ fontSize: 12, color: G.muted, marginBottom: 18 }}>Cel: {isDaily ? "codziennie" : `${habit.weeklyTarget}× w tygodniu`}</div>

          {isDaily ? (
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setMainToday(1)}
                style={{ flex: 1, height: 70, border: "none", borderRadius: 12, cursor: "pointer", background: todayState === DAY.DONE ? G.green : G.bgWarm, color: todayState === DAY.DONE ? "#fff" : G.muted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: SANS, animation: pop && todayState === DAY.DONE ? "jnPop 0.5s ease" : "none" }}>
                <Check size={24} strokeWidth={3} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>Zrobione</span>
              </button>
              <button onClick={() => setMainToday(2)}
                style={{ flex: 1, height: 70, border: "none", borderRadius: 12, cursor: "pointer", background: todayState === DAY.SKIP ? G.red : G.bgWarm, color: todayState === DAY.SKIP ? "#fff" : G.muted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: SANS }}>
                <X size={24} strokeWidth={3} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>Pomijam</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setMainToday(1)}
              style={{ width: "100%", height: 70, border: "none", borderRadius: 12, cursor: "pointer", background: todayState === DAY.DONE ? G.green : G.bgWarm, color: todayState === DAY.DONE ? "#fff" : G.ink, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: SANS, marginBottom: 16, animation: pop && todayState === DAY.DONE ? "jnPop 0.5s ease" : "none" }}>
              <Check size={24} strokeWidth={3} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{todayState === DAY.DONE ? "Zrobione dziś" : "Oznacz: zrobione dziś"}</span>
            </button>
          )}

          {todayState === DAY.DONE && <div style={{ fontSize: 13, color: G.green, fontWeight: 700, textAlign: "center", marginBottom: 16 }}>Świetnie, zaliczone na dziś.</div>}

          <button onClick={onGoToWeek}
            style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: G.ink }}>W tym tygodniu: <strong>{done}/{habit.weeklyTarget}</strong></span>
            <span style={{ fontSize: 12, color: G.goldDeep, fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>Cały tydzień <ChevronRight size={15} /></span>
          </button>
        </>
      )}

      {maint.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={eyebrow}>Utrzymanie · dziś</div>
          {maint.map((m) => {
            const dn = m.days[ti] === DAY.DONE;
            return (
              <div key={m.habit.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${G.border}` }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: G.ink, lineHeight: 1.35 }}>{m.habit.text}</div>
                <button onClick={() => setMaintToday(m)} aria-label="Zrobione dziś"
                  style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 9, border: dn ? "none" : `1px solid ${G.border}`, background: dn ? G.green : "transparent", color: dn ? "#fff" : G.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={17} strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
