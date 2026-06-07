// ============================================================
// Jeden Nawyk - PODGLAD ADMINA (detal osoby)
// Pokazuje pomiary (kształt piramidy + kontekst) oraz kalendarz
// realizacji nawykow tydzien po tygodniu. Tylko do odczytu.
// Dane pobierane przez funkcje SECURITY DEFINER (kontrola admina w bazie).
// ============================================================

import { useState, useEffect, type CSSProperties } from "react";
import { ChevronLeft } from "lucide-react";
import { adminGetAudits, adminGetWeeks, type AuditRow, type WeekRow } from "@/lib/jeden-nawyk/db";
import { weekStartFromKey, weekDates, MONTHS_LONG } from "@/lib/jeden-nawyk/dates";

const G = {
  bg: "#fdfcf8", bgWarm: "#f7f3e8", ink: "#1a1a1a", gold: "#d4a72c",
  goldDeep: "#b88a1c", muted: "#888780", border: "#ebe8de", green: "#2a7a3b", red: "#c33",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const eyebrow: CSSProperties = { fontSize: 10, letterSpacing: "0.28em", color: G.goldDeep, textTransform: "uppercase", fontWeight: 700, marginBottom: 12 };

const LEVELS = [
  { id: "tozsamosc", name: "Tożsamość" },
  { id: "odzywianie", name: "Odżywianie" },
  { id: "aktywnosc", name: "Aktywność" },
  { id: "regeneracja", name: "Regeneracja" },
  { id: "optymalizacja", name: "Optymalizacja" },
];

function weekLabel(key: string): string {
  const dts = weekDates(weekStartFromKey(key));
  const a = dts[0], b = dts[6];
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}-${b.getDate()} ${MONTHS_LONG[a.getMonth()]}`;
  return `${a.getDate()} ${MONTHS_LONG[a.getMonth()]} - ${b.getDate()} ${MONTHS_LONG[b.getMonth()]}`;
}

export default function AdminUserView({ userId, nickname, onClose }: { userId: string; nickname: string; onClose: () => void; }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [a, w] = await Promise.all([adminGetAudits(userId), adminGetWeeks(userId)]);
        if (!alive) return;
        setAudits(a);
        setWeeks(w);
        setLoading(false);
        setErr(false);
      } catch (e) {
        console.error(e);
        if (alive) { setErr(true); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  // Grupowanie tygodni po kluczu, najnowsze pierwsze.
  const seen: Record<string, WeekRow[]> = {};
  weeks.forEach((w) => { (seen[w.weekKey] = seen[w.weekKey] ?? []).push(w); });
  const byWeek = Object.keys(seen)
    .sort((x, y) => (x < y ? 1 : x > y ? -1 : 0))
    .map((k) => ({ key: k, items: seen[k] }));

  const backBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: G.goldDeep, fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 14 };
  const card: CSSProperties = { border: `1px solid ${G.border}`, borderRadius: 10, padding: 16, marginBottom: 14, background: G.bg };

  return (
    <div>
      <button onClick={onClose} style={backBtn}><ChevronLeft size={15} /> Ranking</button>

      <div style={eyebrow}>Podgląd osoby</div>
      <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, lineHeight: 1.12, marginBottom: 18 }}>{nickname}</div>

      {loading && <div style={{ fontFamily: SERIF, fontStyle: "italic", color: G.muted, textAlign: "center", padding: "40px 0" }}>Wczytywanie danych...</div>}

      {err && !loading && (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div style={{ fontFamily: SERIF, fontSize: 18, marginBottom: 8 }}>Nie udało się wczytać danych.</div>
          <div style={{ fontSize: 13, color: G.muted }}>Sprawdź, czy masz uprawnienia admina, i odśwież.</div>
        </div>
      )}

      {!loading && !err && (
        <>
          {/* POMIARY */}
          <div style={eyebrow}>Pomiary ({audits.length})</div>
          {audits.length === 0 ? (
            <div style={{ fontSize: 13, color: G.muted, marginBottom: 24 }}>Brak pomiarów.</div>
          ) : (
            audits.map((a) => (
              <div key={a.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 15 }}>{new Date(a.createdAt).toLocaleDateString("pl-PL")}</span>
                  <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700 }}>{a.total.toFixed(1)}<span style={{ fontSize: 12, color: G.muted, fontWeight: 400 }}> / 10</span></span>
                </div>
                {LEVELS.map((l) => {
                  const s = Number(a.levelScores[l.id] ?? 0);
                  return (
                    <div key={l.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: "#5f5e5a" }}>{l.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{s.toFixed(1)}</span>
                      </div>
                      <div style={{ height: 5, background: G.border, borderRadius: 999 }}>
                        <div style={{ height: "100%", width: (s / 10 * 100) + "%", background: G.ink, borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const c = (a.context ?? {}) as Record<string, unknown>;
                  const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");
                  const sam = c.samopoczucie;
                  const samNum = typeof sam === "number" ? sam : (typeof sam === "string" && sam.trim() !== "" ? Number(sam) : null);
                  const hasSam = samNum !== null && !Number.isNaN(samNum);
                  const fields = [
                    { label: "Cel na 90 dni", value: txt(c.cel) },
                    { label: "Jestem osobą, która...", value: txt(c.slowo) },
                    { label: "Chcę być osobą, która...", value: txt(c.transformacja) },
                    { label: "Co zmieniło się od poprzedniego pomiaru", value: txt(c.zmiana) },
                  ].filter((f) => f.value.length > 0);
                  if (!hasSam && fields.length === 0) return null;
                  return (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${G.border}`, paddingTop: 12 }}>
                      {hasSam && <div style={{ fontSize: 12, color: "#5f5e5a", marginBottom: 8 }}>Samopoczucie: <b>{Math.round(Number(samNum))}/10</b></div>}
                      {fields.map((f, i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: G.goldDeep, fontWeight: 700, marginBottom: 2 }}>{f.label}</div>
                          <div style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.4 }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ))
          )}

          {/* KALENDARZ NAWYKOW */}
          <div style={{ ...eyebrow, marginTop: 28 }}>Realizacja nawyków</div>
          <div style={{ fontSize: 11, color: G.muted, marginBottom: 16, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: G.green, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />zrobione</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: G.red, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />nie zrobione</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, border: `1px solid ${G.border}`, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />brak wpisu</span>
          </div>

          {byWeek.length === 0 ? (
            <div style={{ fontSize: 13, color: G.muted }}>Brak danych o nawykach.</div>
          ) : (
            byWeek.map((wk) => (
              <div key={wk.key} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.ink, marginBottom: 8 }}>{weekLabel(wk.key)}</div>
                {wk.items.map((w, idx) => (
                  <div key={idx} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, marginBottom: 5, display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.habitName || "(nawyk)"}</span>
                      {w.isMaintenance && <span style={{ fontSize: 9, color: G.goldDeep, border: `1px solid ${G.border}`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>utrzymanie</span>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const v = Number(w.days?.[i] ?? 0);
                        return (
                          <div key={i} style={{ flex: 1, height: 24, borderRadius: 5, background: v === 1 ? G.green : v === 2 ? G.red : "transparent", border: v === 0 ? `1px solid ${G.border}` : "none", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {v === 1 ? "✓" : v === 2 ? "✕" : ""}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
