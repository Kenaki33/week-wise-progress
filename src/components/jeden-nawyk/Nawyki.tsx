// ============================================================
// Jeden Nawyk - zakladka Nawyki
// Pula: 5 poziomow -> sciezki -> 4 kroki, blokady kaskadowe.
// Akcje: ustaw jako glowny, albo "juz to robie" (opanowany z marszu).
// ============================================================

import { useState, useEffect, type CSSProperties } from "react";
import { Check, Lock, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveHabitId, setActiveHabitId, getMastered, upsertMastered, upsertWeek, type MasteredRow,
} from "@/lib/jeden-nawyk/db";
import { POOL, DIFFICULTY_LABEL, type PoolHabit, type PoolPath } from "@/lib/jeden-nawyk/habitPool";
import { weekKey } from "@/lib/jeden-nawyk/dates";

const G = {
  bg: "#fdfcf8", bgWarm: "#f7f3e8", ink: "#1a1a1a", gold: "#d4a72c",
  goldDeep: "#b88a1c", muted: "#888780", border: "#ebe8de", green: "#2a7a3b", silver: "#9a9a9a",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const eyebrow: CSSProperties = { fontSize: 10, letterSpacing: "0.28em", color: G.goldDeep, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 };

type StepState = "mastered" | "active" | "available" | "locked";

export default function Nawyki({ active }: { active: boolean }) {
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [masteredMap, setMasteredMap] = useState<Record<string, MasteredRow>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [id, mastered] = await Promise.all([getActiveHabitId(), getMastered()]);
      setActiveId(id);
      const map: Record<string, MasteredRow> = {};
      mastered.forEach((m) => { map[m.pathId] = m; });
      setMasteredMap(map);
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się wczytać puli.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (active || loading) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [active]);

  const setMain = async (h: PoolHabit) => {
    if (busy) return;
    setBusy(true);
    try {
      await setActiveHabitId(h.id);
      await upsertWeek({
        weekKey: weekKey(new Date()), habitPoolId: h.id, habitName: h.text, days: [0, 0, 0, 0, 0, 0, 0],
        weeklyTarget: h.weeklyTarget, weeklyScore: null, passed: null, isMaintenance: false, isCustom: false, reflection: null,
      });
      toast.success("Ustawiono jako główny nawyk. Zobacz zakładkę Tydzień.");
      await load();
    } catch (e) { console.error(e); toast.error("Nie udało się ustawić."); }
    finally { setBusy(false); }
  };

  const declare = async (path: PoolPath, i: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await upsertMastered(path.id, i, "declared");
      toast.success("Opanowane z marszu. Odblokowano kolejny krok.");
      await load();
    } catch (e) { console.error(e); toast.error("Nie udało się zapisać."); }
    finally { setBusy(false); }
  };

  if (loading) return <div style={{ fontFamily: SERIF, fontStyle: "italic", color: G.muted, textAlign: "center", padding: "40px 0" }}>Wczytywanie...</div>;

  const stepState = (path: PoolPath, h: PoolHabit, i: number): StepState => {
    const masteredLevel = masteredMap[path.id]?.levelIdx ?? -1;
    if (h.id === activeId) return "active";
    if (i <= masteredLevel) return "mastered";
    if (i === masteredLevel + 1) return "available";
    return "locked";
  };

  return (
    <div>
      <div style={eyebrow}>Nawyki · pula</div>
      <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, lineHeight: 1.12, marginBottom: 8 }}>
        Wybierz, nad czym <span style={{ fontStyle: "italic", color: G.goldDeep }}>pracujesz</span>.
      </div>
      <div style={{ fontSize: 12, color: G.muted, marginBottom: 22, lineHeight: 1.5 }}>
        Każda ścieżka to 4 kroki o rosnącej trudności. Kolejny odblokowuje się, gdy opanujesz poprzedni.
      </div>

      {POOL.map((level, li) => (
        <section key={level.id} style={{ marginBottom: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 30, height: 30, background: G.ink, color: G.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, borderRadius: 7, flexShrink: 0 }}>0{li + 1}</span>
            <span style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500 }}>{level.name}</span>
          </div>

          {level.paths.map((path) => {
            const masteredLevel = masteredMap[path.id]?.levelIdx ?? -1;
            const open = expanded === path.id;
            const doneCount = masteredLevel + 1; // ile krokow opanowanych
            return (
              <div key={path.id} style={{ border: `1px solid ${G.border}`, marginBottom: 8 }}>
                <button onClick={() => setExpanded(open ? null : path.id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "13px 14px", background: "transparent", border: "none", cursor: "pointer", fontFamily: SANS, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: G.ink }}>{path.name}</span>
                    {path.habits.some((h) => h.id === activeId) && (
                      <span style={{ fontSize: 9, color: G.goldDeep, fontWeight: 700, letterSpacing: "0.1em", background: "rgba(212,167,44,0.15)", padding: "2px 6px", borderRadius: 4 }}>AKTYWNA</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: G.muted }}>{Math.max(0, doneCount)}/4</span>
                    {open ? <ChevronDown size={16} color={G.muted} /> : <ChevronRight size={16} color={G.muted} />}
                  </div>
                </button>

                {open && (
                  <div style={{ padding: "0 14px 12px" }}>
                    {path.habits.map((h, i) => {
                      const st = stepState(path, h, i);
                      return (
                        <div key={h.id} style={{ borderTop: `1px solid ${G.border}`, padding: "12px 0", opacity: st === "locked" ? 0.5 : 1 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <StepIcon state={st} index={i} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, lineHeight: 1.4, color: G.ink }}>{h.text}</div>
                              <div style={{ fontSize: 10, color: G.muted, marginTop: 3 }}>
                                {DIFFICULTY_LABEL[h.difficulty]} · cel {h.weeklyTarget === 7 ? "codziennie" : `${h.weeklyTarget}×/tydz`}
                                {st === "active" ? " · AKTUALNY" : ""}
                                {st === "mastered" ? (masteredMap[path.id]?.source === "declared" && i === masteredLevel ? " · opanowany z marszu" : " · opanowany") : ""}
                              </div>
                            </div>
                          </div>

                          {st === "available" && (
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                              <button onClick={() => setMain(h)} disabled={busy}
                                style={{ flex: 1, background: G.ink, color: G.gold, border: "none", padding: "9px 8px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: SANS }}>
                                Ustaw jako główny
                              </button>
                              <button onClick={() => declare(path, i)} disabled={busy}
                                style={{ flex: 1, background: "transparent", color: G.ink, border: `1px solid ${G.ink}`, padding: "9px 8px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: SANS }}>
                                Już to robię
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function StepIcon({ state, index }: { state: StepState; index: number }) {
  const base: CSSProperties = { width: 24, height: 24, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700 };
  if (state === "mastered") return <span style={{ ...base, background: G.green, color: "#fff" }}><Check size={13} strokeWidth={3} /></span>;
  if (state === "active") return <span style={{ ...base, background: G.gold, color: G.ink }}>{index + 1}</span>;
  if (state === "available") return <span style={{ ...base, background: "transparent", color: G.ink, border: `2px solid ${G.ink}` }}>{index + 1}</span>;
  return <span style={{ ...base, background: G.bgWarm, color: G.silver }}><Lock size={12} /></span>;
}
