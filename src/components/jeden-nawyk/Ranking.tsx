// ============================================================
// Jeden Nawyk - zakladka Ranking
// Miesieczny ranking (suma punktow z biezacego miesiaca) + filtr osobowosci.
// Punktacja: nasza nowa (finalWeekScore na tydzien, utrzymanie 1/3).
// Miesiac tygodnia = miesiac jego niedzieli (jak ustalilismy).
// ============================================================

import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import {
  getRankingWeeks, getAllProfiles, getUserId, getIsAdmin, type RankWeek, type ProfileRow,
} from "@/lib/jeden-nawyk/db";
import { liveWeekScore, weekMonthKey } from "@/lib/jeden-nawyk/scoring";
import { weekStartFromKey, scoringTodayIndex } from "@/lib/jeden-nawyk/dates";
import AdminUserView from "@/components/jeden-nawyk/AdminUserView";

const G = {
  bg: "#fdfcf8", bgWarm: "#f7f3e8", ink: "#1a1a1a", gold: "#d4a72c",
  goldDeep: "#b88a1c", muted: "#888780", border: "#ebe8de", green: "#2a7a3b", red: "#c33",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const eyebrow: CSSProperties = { fontSize: 10, letterSpacing: "0.28em", color: G.goldDeep, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 };

const PERSONALITY_LABELS: Record<string, string> = {
  ekspresowy_konsument: "Ekspresowy Konsument",
  emocjonalny_podjadacz: "Emocjonalny Podjadacz",
  beztroski_lasuch: "Beztroski Łasuch",
  nieswiadomy_zjadacz: "Nieświadomy Zjadacz",
  perfekcjonista_dietetyczny: "Perfekcjonista Dietetyczny",
  wieczny_odchudzacz: "Wieczny Odchudzacz",
  ogarniety_odzywiacze: "Ogarnięty Odżywiacz",
};

interface Row { userId: string; nickname: string; personality: string | null; monthly: number; total: number; }

export default function Ranking({ active }: { active: boolean }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [err, setErr] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selected, setSelected] = useState<{ userId: string; nickname: string } | null>(null);

  useEffect(() => {
    if (!(active || loading)) return;
    let alive = true;
    (async () => {
      try {
        const [weeks, profiles, uid, admin] = await Promise.all([getRankingWeeks(), getAllProfiles(), getUserId(), getIsAdmin()]);
        if (!alive) return;
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const agg: Record<string, { monthly: number; total: number }> = {};
        weeks.forEach((w: RankWeek) => {
          const ws = weekStartFromKey(w.weekKey);
          const ti = scoringTodayIndex(ws, now);
          let sc = liveWeekScore({ days: w.days as (0 | 1 | 2)[], weeklyTarget: w.weeklyTarget, todayIndex: ti });
          if (w.isMaintenance) sc = Math.round(sc / 3);
          const a = agg[w.userId] ?? (agg[w.userId] = { monthly: 0, total: 0 });
          a.total += sc;
          if (weekMonthKey(ws) === currentMonth) a.monthly += sc;
        });

        const list: Row[] = profiles.map((p: ProfileRow) => ({
          userId: p.userId,
          nickname: p.nickname || "Bez nicku",
          personality: p.personality,
          monthly: agg[p.userId]?.monthly ?? 0,
          total: agg[p.userId]?.total ?? 0,
        }));
        list.sort((a, b) => b.monthly - a.monthly || b.total - a.total);

        setRows(list);
        setMe(uid);
        setIsAdmin(admin);
        setLoading(false);
        setErr(false);
      } catch (e) {
        console.error(e);
        if (alive) { setErr(true); setLoading(false); }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.personality === filter)),
    [rows, filter]
  );

  const top = filtered.slice(0, 50);
  const meInTop = top.some((r) => r.userId === me);
  const meRow = !meInTop && me ? filtered.find((r) => r.userId === me) ?? null : null;
  const mePos = meRow ? filtered.findIndex((r) => r.userId === me) + 1 : -1;

  const scoreColor = (n: number) => (n > 0 ? G.green : n < 0 ? G.red : G.muted);

  if (selected) return <AdminUserView userId={selected.userId} nickname={selected.nickname} onClose={() => setSelected(null)} />;

  if (loading) return <div style={{ fontFamily: SERIF, fontStyle: "italic", color: G.muted, textAlign: "center", padding: "40px 0" }}>Wczytywanie rankingu...</div>;
  if (err) return (
    <div style={{ textAlign: "center", padding: "30px 0" }}>
      <div style={{ fontFamily: SERIF, fontSize: 18, marginBottom: 8 }}>Nie udało się wczytać rankingu.</div>
      <div style={{ fontSize: 13, color: G.muted }}>Odśwież stronę za chwilę.</div>
    </div>
  );

  const RowItem = ({ r, pos }: { r: Row; pos: number }) => {
    const mine = r.userId === me;
    const medal = pos === 1 ? "#d4a72c" : pos === 2 ? "#b8b8b8" : pos === 3 ? "#c08850" : null;
    return (
      <div onClick={isAdmin ? () => setSelected({ userId: r.userId, nickname: r.nickname }) : undefined}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px", borderTop: `1px solid ${G.border}`, background: mine ? "rgba(212,167,44,0.1)" : "transparent", cursor: isAdmin ? "pointer" : "default" }}>
        <div style={{ width: 28, textAlign: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: medal ?? G.ink }}>{pos}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: G.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.nickname}{mine ? <span style={{ color: G.goldDeep, fontWeight: 700 }}> (Ty)</span> : ""}
          </div>
          <div style={{ fontSize: 10, color: G.muted }}>{r.personality ? PERSONALITY_LABELS[r.personality] ?? r.personality : "-"}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: scoreColor(r.monthly), lineHeight: 1 }}>{r.monthly >= 0 ? "+" : ""}{r.monthly}</div>
          <div style={{ fontSize: 9, color: G.muted, marginTop: 2 }}>łącznie {r.total >= 0 ? "+" : ""}{r.total}</div>
        </div>
        {isAdmin && <ChevronRight size={16} color={G.muted} style={{ flexShrink: 0, marginLeft: 2 }} />}
      </div>
    );
  };

  return (
    <div>
      <div style={eyebrow}>Ranking · ten miesiąc</div>
      <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, lineHeight: 1.12, marginBottom: 8 }}>
        Jak <span style={{ fontStyle: "italic", color: G.goldDeep }}>wypadasz</span>.
      </div>
      <div style={{ fontSize: 12, color: G.muted, marginBottom: 16, lineHeight: 1.5 }}>
        Punkty z bieżącego miesiąca. Ranking zeruje się 1. dnia miesiąca.
      </div>

      {/* FILTR OSOBOWOSCI */}
      <select value={filter} onChange={(e) => setFilter(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: `1px solid ${G.border}`, background: G.bg, color: G.ink, fontFamily: SANS, marginBottom: 14, cursor: "pointer", outline: "none" }}>
        <option value="all">Wszyscy użytkownicy</option>
        {Object.entries(PERSONALITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: G.muted, fontSize: 14 }}>Brak użytkowników do wyświetlenia.</div>
      ) : (
        <div style={{ border: `1px solid ${G.border}`, borderTop: "none" }}>
          {top.map((r, i) => <RowItem key={r.userId} r={r} pos={i + 1} />)}
          {meRow && (
            <>
              <div style={{ textAlign: "center", fontSize: 11, color: G.muted, padding: "8px 0", borderTop: `1px solid ${G.border}`, background: G.bgWarm }}>...</div>
              <RowItem r={meRow} pos={mePos} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
