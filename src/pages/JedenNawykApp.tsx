// ============================================================
// Jeden Nawyk - nowa apka (pod /app, rownolegle do starej apki pod /)
// Krok 1: Piramida (czyta zapisany audyt z bazy) + Profil (wylogowanie).
// Tydzien i Nawyki - kolejny krok.
// ============================================================

import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Layers, Triangle, User as UserIcon, TrendingUp, TrendingDown, LogOut, ChevronLeft, ChevronRight, Trophy, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getLatestAudits, type AuditRow } from "@/lib/jeden-nawyk/db";
import Tydzien from "@/components/jeden-nawyk/Tydzien";
import Dzisiaj from "@/components/jeden-nawyk/Dzisiaj";
import Nawyki from "@/components/jeden-nawyk/Nawyki";
import Ranking from "@/components/jeden-nawyk/Ranking";

const G = {
  bg: "#fdfcf8", bgWarm: "#f7f3e8", ink: "#1a1a1a", gold: "#d4a72c",
  goldDeep: "#b88a1c", muted: "#888780", border: "#ebe8de", green: "#2a7a3b", red: "#c33",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";

const PYRAMID_META = [
  { id: "tozsamosc", name: "Tożsamość", dims: [
    { id: "narracja", name: "Wewnętrzna narracja" },
    { id: "spojnosc", name: "Spójność wartości z działaniem" },
  ]},
  { id: "odzywianie", name: "Odżywianie", dims: [
    { id: "swiadomosc", name: "Świadomość tego, co jem" },
    { id: "regularnosc", name: "Regularność i rytm posiłków" },
    { id: "relacja", name: "Relacja z jedzeniem" },
  ]},
  { id: "aktywnosc", name: "Aktywność fizyczna", dims: [
    { id: "sila", name: "Siła i masa mięśniowa" },
    { id: "wydolnosc", name: "Wydolność i kondycja" },
    { id: "mobilnosc", name: "Mobilność i jakość ruchu" },
  ]},
  { id: "regeneracja", name: "Regeneracja", dims: [
    { id: "sen", name: "Sen - jakość i ilość" },
    { id: "stres", name: "Zarządzanie stresem" },
  ]},
  { id: "optymalizacja", name: "Optymalizacja", dims: [
    { id: "badania", name: "Badania i monitorowanie" },
    { id: "suplementacja", name: "Suplementacja i protokoły" },
  ]},
];

type Tab = "dzis" | "tydzien" | "nawyki" | "piramida" | "ranking" | "profil";

// Prosty hook: czy szeroki ekran (desktop)
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

export default function JedenNawykApp() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [tab, setTab] = useState<Tab>("dzis");
  const [pyramidDue, setPyramidDue] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) { navigate("/", { replace: true }); return; }
      setEmail(data.user.email ?? "");
      setChecking(false);
      try {
        const audits = await getLatestAudits(1);
        if (active && audits[0]) {
          const days = Math.floor((Date.now() - new Date(audits[0].createdAt).getTime()) / 86400000);
          setPyramidDue(days >= 90);
        }
      } catch (e) { console.error(e); }
    })();
    return () => { active = false; };
  }, [navigate]);

  if (checking) {
    return (
      <div style={{ background: G.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontStyle: "italic", color: G.muted }}>
        Wczytywanie...
      </div>
    );
  }

  const maxW = isDesktop ? 780 : 480;

  return (
    <div style={{ background: G.bg, minHeight: "100vh", fontFamily: SANS, color: G.ink, maxWidth: maxW, margin: "0 auto", paddingBottom: isDesktop ? 40 : "calc(84px + env(safe-area-inset-bottom))" }}>
      <header style={{ background: G.ink, color: G.bg, borderBottom: `2px solid ${G.gold}`, padding: isDesktop ? "14px 28px" : "calc(13px + env(safe-area-inset-top)) 20px 13px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, fontStyle: "italic", fontWeight: 500 }}>Jeden <span style={{ color: G.gold }}>Nawyk.</span></div>
          {isDesktop ? (
            <nav style={{ display: "flex", gap: 4 }}>
              {NAV.map(({ id, icon: Icon, label }) => {
                const on = tab === id;
                return (
                  <button key={id} onClick={() => setTab(id)}
                    style={{ display: "flex", alignItems: "center", gap: 7, background: on ? G.gold : "transparent", color: on ? G.ink : "rgba(253,252,248,0.7)", border: "none", padding: "8px 14px", borderRadius: 7, cursor: "pointer", fontFamily: SANS, fontSize: 13, fontWeight: on ? 700 : 500 }}>
                    <span style={{ position: "relative", display: "inline-flex" }}>
                      <Icon size={16} strokeWidth={on ? 2.4 : 1.8} />
                      {id === "piramida" && pyramidDue && <PyramidBadge />}
                    </span>{label}
                  </button>
                );
              })}
            </nav>
          ) : (
            <div style={{ fontSize: 11, color: "rgba(253,252,248,0.5)" }}>{TAB_LABEL[tab]}</div>
          )}
        </div>
      </header>

      <main style={{ padding: isDesktop ? "32px 28px 48px" : "24px 20px 40px" }}>
        <div style={{ display: tab === "dzis" ? "block" : "none" }}><Dzisiaj active={tab === "dzis"} onGoToWeek={() => setTab("tydzien")} /></div>
        <div style={{ display: tab === "piramida" ? "block" : "none" }}><Piramida navigate={navigate} active={tab === "piramida"} /></div>
        <div style={{ display: tab === "tydzien" ? "block" : "none" }}><Tydzien active={tab === "tydzien"} onGoToHabits={() => setTab("nawyki")} /></div>
        <div style={{ display: tab === "nawyki" ? "block" : "none" }}><Nawyki active={tab === "nawyki"} /></div>
        <div style={{ display: tab === "ranking" ? "block" : "none" }}><Ranking active={tab === "ranking"} /></div>
        <div style={{ display: tab === "profil" ? "block" : "none" }}><Profil email={email} navigate={navigate} /></div>
      </main>

      {/* DOLNA NAWIGACJA - tylko na telefonie */}
      {!isDesktop && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: G.bg, borderTop: `1px solid ${G.border}`, display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {NAV.map(({ id, icon: Icon, label }) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)}
                style={{ flex: 1, background: "transparent", border: "none", padding: "10px 0 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: on ? G.ink : G.muted, fontFamily: SANS }}>
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Icon size={20} strokeWidth={on ? 2.4 : 1.8} />
                  {id === "piramida" && pyramidDue && <PyramidBadge />}
                </span>
                <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: "0.04em" }}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function PyramidBadge() {
  return (
    <span style={{ position: "absolute", top: -6, right: -8, minWidth: 15, height: 15, padding: "0 3px", boxSizing: "border-box", background: "#c33", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, lineHeight: "15px", textAlign: "center", border: "1.5px solid #fdfcf8" }}>!</span>
  );
}

const NAV: { id: Tab; icon: typeof BookOpen; label: string }[] = [
  { id: "dzis", icon: Sun, label: "Dziś" },
  { id: "nawyki", icon: Layers, label: "Nawyki" },
  { id: "piramida", icon: Triangle, label: "Piramida" },
  { id: "ranking", icon: Trophy, label: "Ranking" },
  { id: "profil", icon: UserIcon, label: "Profil" },
];
const TAB_LABEL: Record<Tab, string> = { dzis: "Dziś", tydzien: "Tydzień", nawyki: "Nawyki", piramida: "Piramida", ranking: "Ranking", profil: "Profil" };

const eyebrow: CSSProperties = { fontSize: 10, letterSpacing: "0.28em", color: G.goldDeep, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 };

function Delta({ d }: { d: number }) {
  if (Math.abs(d) < 0.05) return <span style={{ fontSize: 11, color: G.muted, fontWeight: 600 }}>=</span>;
  const pos = d > 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, color: pos ? G.green : G.red }}>
      {pos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{pos ? "+" : ""}{d.toFixed(1)}
    </span>
  );
}

function Piramida({ navigate, active }: { navigate: ReturnType<typeof useNavigate>; active: boolean }) {
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [idx, setIdx] = useState(0); // 0 = najnowszy pomiar
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!(active || loading)) return;
    let alive = true;
    (async () => {
      try {
        const a = await getLatestAudits(100);
        if (alive) { setAudits(a); setIdx(0); setLoading(false); setErr(false); }
      } catch (e) {
        console.error(e);
        if (alive) { setErr(true); setLoading(false); }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const current = audits[idx];
  const prev = audits[idx + 1]; // chronologicznie wczesniejszy pomiar (delta liczona wzgledem niego)
  const canOlder = idx < audits.length - 1;
  const canNewer = idx > 0;

  const radar = useMemo(() => {
    const size = 260, cx = size / 2, cy = size / 2, R = 78, n = 5, a0 = -Math.PI / 2;
    const ring = (rr: number, i: number): [number, number] => {
      const a = a0 + i * ((Math.PI * 2) / n);
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
    };
    const pt = (val: number, i: number): [number, number] => {
      const a = a0 + i * ((Math.PI * 2) / n); const r = (R * val) / 10;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const rings = [1, 2, 3, 4, 5].map((k) => PYRAMID_META.map((_l, i) => ring((R * k) / 5, i)).map((p) => p.join(",")).join(" "));
    const vals = PYRAMID_META.map((l) => (current ? Number(current.levelScores[l.id] ?? 0) : 0));
    const cur = vals.map((v, i) => pt(v, i));
    const axes = PYRAMID_META.map((_l, i) => ring(R, i));
    const labels = PYRAMID_META.map((l, i) => {
      const a = a0 + i * ((Math.PI * 2) / n);
      return {
        x: cx + Math.cos(a) * (R + 22), y: cy + Math.sin(a) * (R + 22),
        name: l.name === "Aktywność fizyczna" ? "Aktywność" : l.name,
        anchor: (Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle") as "start" | "end" | "middle",
      };
    });
    return { size, cx, cy, rings, cur, axes, labels };
  }, [current]);

  if (loading) return <div style={{ fontFamily: SERIF, fontStyle: "italic", color: G.muted, textAlign: "center", padding: "40px 0" }}>Wczytywanie wyników...</div>;

  if (err) return (
    <div style={{ textAlign: "center", padding: "30px 0" }}>
      <div style={{ fontFamily: SERIF, fontSize: 18, marginBottom: 8 }}>Nie udało się wczytać audytu.</div>
      <div style={{ fontSize: 13, color: G.muted }}>Odśwież stronę za chwilę.</div>
    </div>
  );

  if (!current) return (
    <div style={{ textAlign: "center", padding: "30px 0" }}>
      <div style={eyebrow}>Twoja Piramida</div>
      <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, marginBottom: 14 }}>Nie masz jeszcze audytu.</div>
      <button onClick={() => navigate("/onboarding")} style={{ background: G.ink, color: G.gold, border: "none", padding: "13px 26px", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>Zrób audyt</button>
    </div>
  );

  const totalDelta = prev ? current.total - prev.total : null;
  const daysSince = Math.floor((Date.now() - new Date(current.createdAt).getTime()) / 86400000);
  const canRetest = daysSince >= 30;
  const daysToRetest = Math.max(0, 30 - daysSince);
  const daysTo90 = Math.max(0, 90 - daysSince);

  return (
    <div>
      <div style={eyebrow}>Twoja Piramida</div>
      <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, lineHeight: 1.12, marginBottom: 18 }}>
        Co <span style={{ fontStyle: "italic", color: G.goldDeep }}>zmierzyłeś</span>.
      </div>

      {/* NAWIGACJA MIEDZY POMIARAMI */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
        <button onClick={() => canOlder && setIdx(idx + 1)} disabled={!canOlder} aria-label="Wcześniejszy pomiar"
          style={{ background: "transparent", border: `1px solid ${canOlder ? G.ink : G.border}`, color: canOlder ? G.ink : G.border, borderRadius: 999, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: canOlder ? "pointer" : "not-allowed", flexShrink: 0 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ textAlign: "center", lineHeight: 1.3 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: G.muted }}>
            Pomiar {audits.length - idx} z {audits.length}{idx === 0 ? " · najnowszy" : ""}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600 }}>{new Date(current.createdAt).toLocaleDateString("pl-PL")}</div>
        </div>
        <button onClick={() => canNewer && setIdx(idx - 1)} disabled={!canNewer} aria-label="Kolejny pomiar"
          style={{ background: "transparent", border: `1px solid ${canNewer ? G.ink : G.border}`, color: canNewer ? G.ink : G.border, borderRadius: 999, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: canNewer ? "pointer" : "not-allowed", flexShrink: 0 }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ textAlign: "center", padding: "18px 0", borderTop: `1px solid ${G.ink}`, borderBottom: `1px solid ${G.ink}`, marginBottom: 22 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: G.muted, marginBottom: 4 }}>Wynik ogólny</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8 }}>
          <span style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 600, lineHeight: 1 }}>{current.total.toFixed(1)}</span>
          <span style={{ fontSize: 18, color: G.muted }}>/ 10</span>
          {totalDelta !== null && <Delta d={totalDelta} />}
        </div>
      </div>

      <div style={eyebrow}>Kształt Piramidy</div>
      <svg viewBox={`-72 0 ${radar.size + 144} ${radar.size}`} style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto 24px" }}>
        {radar.rings.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke={G.border} strokeWidth="1" />)}
        {radar.axes.map((p, i) => <line key={i} x1={radar.cx} y1={radar.cy} x2={p[0]} y2={p[1]} stroke={G.border} strokeWidth="1" />)}
        <polygon points={radar.cur.map((p) => p.join(",")).join(" ")} fill="rgba(212,167,44,0.18)" stroke={G.gold} strokeWidth="2.5" />
        {radar.cur.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={G.gold} />)}
        {radar.labels.map((l, i) => <text key={i} x={l.x} y={l.y} textAnchor={l.anchor} dominantBaseline="middle" fontSize="10" fontWeight="600" fill="#5f5e5a" fontFamily={SANS}>{l.name}</text>)}
      </svg>

      <div style={eyebrow}>Szczegółowy rozkład</div>
      {PYRAMID_META.map((lvl, li) => {
        const lvlScore = Number(current.levelScores[lvl.id] ?? 0);
        const lvlPrev = prev ? Number(prev.levelScores[lvl.id] ?? 0) : null;
        return (
          <div key={lvl.id} style={{ borderTop: `1px solid ${G.border}`, padding: "16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500 }}>0{li + 1} · {lvl.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600 }}>{lvlScore.toFixed(1)}</span>
                {lvlPrev !== null && <Delta d={lvlScore - lvlPrev} />}
              </div>
            </div>
            {lvl.dims.map((d) => {
              const s = Number(current.dimensionScores[d.id] ?? 0);
              return (
                <div key={d.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#5f5e5a" }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.toFixed(1)}</span>
                  </div>
                  <div style={{ height: 6, background: G.border, borderRadius: 999 }}>
                    <div style={{ height: "100%", width: (s / 10 * 100) + "%", background: G.ink, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {(() => {
        const c = (current.context ?? {}) as Record<string, unknown>;
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
          <div style={{ marginTop: 28 }}>
            <div style={eyebrow}>Twój kontekst z tego pomiaru</div>
            {hasSam && (
              <div style={{ borderTop: `1px solid ${G.border}`, padding: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, color: "#5f5e5a" }}>Samopoczucie w dniu pomiaru</span>
                <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600 }}>{Math.round(Number(samNum))}<span style={{ fontSize: 13, color: G.muted, fontWeight: 400 }}> / 10</span></span>
              </div>
            )}
            {fields.map((f, i) => (
              <div key={i} style={{ borderTop: `1px solid ${G.border}`, padding: "16px 0" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: G.gold, fontWeight: 700, marginBottom: 6 }}>{f.label}</div>
                <div style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.5, color: G.ink }}>{f.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: G.muted, marginTop: 18, textAlign: "center" }}>
        {idx === 0
          ? (daysSince >= 90 ? "Minęło 90 dni od ostatniego pomiaru - dobry moment na nowy." : `To Twój najnowszy pomiar. Pełny kolejny audyt za ${daysTo90} dni.`)
          : "Pomiar archiwalny. Strzałką w prawo wrócisz do najnowszego."}
      </div>

      {idx === 0 && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => navigate("/onboarding")} disabled={!canRetest}
            style={{ width: "100%", background: canRetest ? G.ink : "transparent", color: canRetest ? G.gold : G.muted, border: canRetest ? "none" : `1px solid ${G.border}`, padding: 14, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, cursor: canRetest ? "pointer" : "not-allowed", fontFamily: SANS }}>
            {daysSince >= 90 ? "Wykonaj nowy pomiar" : "Wykonaj test wcześniej"}
          </button>
          <div style={{ textAlign: "center", fontSize: 11, color: G.muted, marginTop: 8, lineHeight: 1.4 }}>
            {!canRetest
              ? `Dostępne za ${daysToRetest} dni (najwcześniej 30 dni po poprzednim pomiarze).`
              : daysSince >= 90
                ? "Czas na kolejny pomiar."
                : "Pełny cykl to 90 dni, ale możesz powtórzyć wcześniej."}
          </div>
        </div>
      )}
    </div>
  );
}

function Profil({ email, navigate }: { email: string; navigate: ReturnType<typeof useNavigate> }) {
  const [out, setOut] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const logout = async () => {
    if (out) return;
    setOut(true);
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const changePw = async () => {
    if (savingPw) return;
    if (pw1.length < 8) { toast.error("Hasło musi mieć min. 8 znaków."); return; }
    if (pw1 !== pw2) { toast.error("Hasła nie są takie same."); return; }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1(""); setPw2("");
      toast.success("Hasło zostało zmienione.");
    } catch (e) { console.error(e); toast.error("Nie udało się zmienić hasła."); }
    finally { setSavingPw(false); }
  };

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Konto zostało usunięte.");
      navigate("/", { replace: true });
    } catch (e) { console.error(e); toast.error("Nie udało się usunąć konta. Spróbuj ponownie."); setDeleting(false); }
  };

  const input: CSSProperties = { width: "100%", padding: "11px 13px", fontSize: 14, border: `1px solid ${G.border}`, background: G.bg, outline: "none", color: G.ink, fontFamily: SANS, marginBottom: 8, boxSizing: "border-box" };
  const sectionLabel: CSSProperties = { ...eyebrow, marginTop: 26, marginBottom: 10 };

  return (
    <div>
      <div style={eyebrow}>Profil</div>
      <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, marginBottom: 20 }}>Twoje konto.</div>

      <div style={{ border: `1px solid ${G.border}`, padding: "16px 18px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: G.muted, marginBottom: 4 }}>Zalogowany jako</div>
        <div style={{ fontSize: 15, color: G.ink }}>{email || "-"}</div>
      </div>

      <div style={sectionLabel}>Zmiana hasła</div>
      <input type="password" placeholder="Nowe hasło (min. 8 znaków)" value={pw1} onChange={(e) => setPw1(e.target.value)} style={input} />
      <input type="password" placeholder="Powtórz nowe hasło" value={pw2} onChange={(e) => setPw2(e.target.value)} style={input} />
      <button onClick={changePw} disabled={savingPw || !pw1 || !pw2}
        style={{ width: "100%", background: G.ink, color: G.gold, border: "none", padding: 13, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, cursor: savingPw ? "wait" : "pointer", fontFamily: SANS, opacity: (!pw1 || !pw2) ? 0.5 : 1 }}>
        {savingPw ? "Zapisuję..." : "Zmień hasło"}
      </button>

      <div style={sectionLabel}>Sesja</div>
      <button onClick={logout} disabled={out}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "transparent", color: G.ink, border: `1px solid ${G.ink}`, padding: 14, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, cursor: out ? "wait" : "pointer", fontFamily: SANS }}>
        <LogOut size={15} /> {out ? "Wylogowuję..." : "Wyloguj"}
      </button>

      <div style={{ ...sectionLabel, color: G.red }}>Strefa niebezpieczna</div>
      {!confirmDel ? (
        <button onClick={() => setConfirmDel(true)}
          style={{ width: "100%", background: "transparent", color: G.red, border: `1px solid ${G.red}`, padding: 13, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
          Usuń konto
        </button>
      ) : (
        <div style={{ border: `1px solid ${G.red}`, padding: 16 }}>
          <div style={{ fontSize: 13, color: G.ink, lineHeight: 1.5, marginBottom: 12 }}>
            Na pewno? To trwale usunie Twoje konto i wszystkie dane (audyty, nawyki, postęp). Tego nie da się cofnąć.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={deleteAccount} disabled={deleting}
              style={{ flex: 1, background: G.red, color: "#fff", border: "none", padding: 12, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, cursor: deleting ? "wait" : "pointer", fontFamily: SANS }}>
              {deleting ? "Usuwam..." : "Tak, usuń trwale"}
            </button>
            <button onClick={() => setConfirmDel(false)} disabled={deleting}
              style={{ flex: 1, background: "transparent", color: G.ink, border: `1px solid ${G.ink}`, padding: 12, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${G.border}`, textAlign: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px", marginBottom: 12 }}>
          <a href="/terms-of-service.html" style={{ fontSize: 12, color: G.goldDeep, textDecoration: "none", fontWeight: 600 }}>Regulamin</a>
          <a href="/privacy-policy.html" style={{ fontSize: 12, color: G.goldDeep, textDecoration: "none", fontWeight: 600 }}>Polityka prywatności</a>
          <a href="https://zdrowo-ogarnieci.pl" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: G.goldDeep, textDecoration: "none", fontWeight: 600 }}>zdrowo-ogarnieci.pl</a>
        </div>
        <div style={{ fontSize: 11, color: G.muted }}>Jeden Nawyk · Patryk Ogar</div>
      </div>
    </div>
  );
}
