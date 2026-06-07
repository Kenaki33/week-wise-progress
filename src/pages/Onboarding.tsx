// ============================================================
// Jeden Nawyk - onboarding z audytem Piramidy
// 40 pytan (36 wymiarowych + 4 kontekstowe) -> wynik -> rekomendacja -> zapis.
// Wejscie do calej apki (brama: bez audytu apka nie rusza - patrz Index.tsx).
// ============================================================

import { useState, useMemo, useEffect, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { recommendHabit, type DimensionId } from "@/lib/jeden-nawyk/habitPool";
import { saveAudit, setActiveHabitId, upsertWeek, getUserId, hasAudit, hasHealthConsent, recordHealthConsent } from "@/lib/jeden-nawyk/db";
import { weekKey } from "@/lib/jeden-nawyk/dates";

const G = {
  bg: "#fdfcf8", bgWarm: "#f7f3e8", ink: "#1a1a1a", gold: "#d4a72c",
  goldDeep: "#b88a1c", muted: "#888780", border: "#ebe8de",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";

// 5 poziomow, 12 wymiarow, 36 pytan. id wymiarow = DimensionId z habitPool.
interface AuditDim { id: string; name: string; q: string[]; }
interface AuditLevel { id: string; name: string; dims: AuditDim[]; }

const LEVELS: AuditLevel[] = [
  { id: "tozsamosc", name: "Tożsamość", dims: [
    { id: "narracja", name: "Wewnętrzna narracja", q: [
      "Kiedy myślę o sobie w kontekście zdrowia, mam jasne, pozytywne wyobrażenie tego, kim jestem.",
      "Nie mówię o sobie 'jestem na diecie', mówię 'dbam o siebie'.",
      "Wierzę, że jestem osobą, która utrzymuje zdrowe nawyki długoterminowo.",
    ] },
    { id: "spojnosc", name: "Spójność wartości z działaniem", q: [
      "To, co deklaruję jako ważne dla mojego zdrowia, faktycznie robię na co dzień.",
      "Moje codzienne decyzje są spójne z osobą, którą chcę być za 5 lat.",
      "Rzadko czuję dysonans między tym, co wiem, a tym, co robię.",
    ] },
  ]},
  { id: "odzywianie", name: "Odżywianie", dims: [
    { id: "swiadomosc", name: "Świadomość tego, co jem", q: [
      "Wiem, ile białka jem dziennie (mniej więcej, w gramach).",
      "Czytam etykiety i potrafię ocenić, czy produkt jest jakościowo dobry.",
      "Mam jasność, jakie produkty mi służą, a jakie pogarszają moje samopoczucie.",
    ] },
    { id: "regularnosc", name: "Regularność i rytm posiłków", q: [
      "Jem o regularnych porach, bez dużego chaosu w ciągu dnia.",
      "Mam stały rytm posiłków, nawet w stresujące dni.",
      "Rzadko zdarza mi się 'zapomnieć zjeść' lub jeść późno w nocy z głodu.",
    ] },
    { id: "relacja", name: "Relacja z jedzeniem", q: [
      "Jedzenie nie jest dla mnie sposobem radzenia sobie z emocjami.",
      "Jem z przyjemnością, bez poczucia winy.",
      "Potrafię odmówić jedzenia, na które nie mam ochoty, bez stresu społecznego.",
    ] },
  ]},
  { id: "aktywnosc", name: "Aktywność fizyczna", dims: [
    { id: "sila", name: "Siła i masa mięśniowa", q: [
      "Trenuję siłowo regularnie (minimum 2 razy w tygodniu).",
      "Czuję, że moja siła w ciągu ostatniego roku rośnie lub się utrzymuje.",
      "Mam masę mięśniową adekwatną do mojego wieku i celów.",
    ] },
    { id: "wydolnosc", name: "Wydolność i kondycja", q: [
      "Bez problemu wchodzę po schodach na 4. piętro bez zadyszki.",
      "Potrafię utrzymać umiarkowany wysiłek (np. szybki marsz, bieg) przez 30+ minut.",
      "Moja kondycja w ciągu ostatniego roku poprawia się lub utrzymuje.",
    ] },
    { id: "mobilnosc", name: "Mobilność i jakość ruchu", q: [
      "Bez problemu sięgam, schylam się, wstaję z podłogi, bez bólu.",
      "Codziennie mam co najmniej 7 000 kroków.",
      "Nie mam przewlekłych ograniczeń ruchowych, które utrudniają codzienność.",
    ] },
  ]},
  { id: "regeneracja", name: "Regeneracja", dims: [
    { id: "sen", name: "Sen - jakość i ilość", q: [
      "Śpię regularnie 7-9 godzin na dobę.",
      "Budzę się wypoczęty, bez budzika lub kilku drzemek.",
      "Mam stałą porę zasypiania i wstawania, nawet w weekendy.",
    ] },
    { id: "stres", name: "Zarządzanie stresem", q: [
      "Mam świadome strategie redukcji stresu, których używam regularnie.",
      "Rzadko czuję się przeciążony lub na granicy wypalenia.",
      "Potrafię wyciszyć się przed snem, bez telefonu, ekranów, alkoholu.",
    ] },
  ]},
  { id: "optymalizacja", name: "Optymalizacja", dims: [
    { id: "badania", name: "Badania i monitorowanie", q: [
      "Robię kompleksowe badania krwi minimum raz w roku.",
      "Znam swoje aktualne wartości: D3, B12, ferrytyna, lipidogram, glukoza, insulina.",
      "Śledzę zmiany swojego ciała w czasie (waga, obwody, samopoczucie).",
    ] },
    { id: "suplementacja", name: "Suplementacja i protokoły", q: [
      "Suplementy, które przyjmuję, są dobrane na podstawie moich badań, nie z polecenia.",
      "Wiem, dlaczego biorę każdy z suplementów, które są w mojej szafce.",
      "Nie wydaję pieniędzy na 'modne' suplementy bez sprawdzonego sensu.",
    ] },
  ]},
];

interface CtxItem { id: string; type: "scale" | "text"; label: string; helper: string; }
const CONTEXT: CtxItem[] = [
  { id: "samopoczucie", type: "scale", label: "Jak ogólnie czujesz się dziś?", helper: "1 = źle, 10 = świetnie" },
  { id: "cel", type: "text", label: "Jaki jest Twój główny cel na najbliższe 90 dni?", helper: "Jedno zdanie, własnymi słowami." },
  { id: "slowo", type: "text", label: "Dziś, jeśli chodzi o zdrowie, jestem osobą, która...", helper: "Jedno zdanie, szczerze, bez upiększania." },
  { id: "transformacja", type: "text", label: "Za 90 dni chcę być osobą, która...", helper: "Jedno zdanie, konkretne, nie ogólne." },
];

// Pytanie pojawiajace sie dopiero od drugiego pomiaru (gdy istnieje wczesniejszy audyt).
const CTX_ZMIANA: CtxItem = { id: "zmiana", type: "text", label: "Co zmieniło się od poprzedniego pomiaru?", helper: "Jedno zdanie - co poszło do przodu, a co stanęło." };

interface FlatDim extends AuditDim { levelId: string; levelName: string; levelIdx: number; }
const DIMS: FlatDim[] = [];
LEVELS.forEach((lvl, li) => lvl.dims.forEach((d) => DIMS.push({ ...d, levelId: lvl.id, levelName: lvl.name, levelIdx: li })));

const TOTAL_DIM = DIMS.length;        // 12

type Answers = Record<string, number | string>;

export default function Onboarding() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [hasPrior, setHasPrior] = useState(false);
  const [consent, setConsent] = useState(false);

  // Brama: bez zalogowania nie ma onboardingu.
  useEffect(() => {
    let active = true;
    (async () => {
      const uid = await getUserId();
      if (!active) return;
      if (!uid) { navigate("/", { replace: true }); return; }
      try {
        const [prior, consented] = await Promise.all([hasAudit(), hasHealthConsent()]);
        if (active) { setHasPrior(prior); setConsent(consented); }
      } catch (e) { console.error(e); }
      if (active) setChecking(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  const setAns = (key: string, val: number | string) => setAnswers((p) => ({ ...p, [key]: val }));

  const scores = useMemo(() => {
    const dim: Record<string, number> = {};
    DIMS.forEach((d) => {
      const sum = d.q.reduce((s, _q, i) => s + Number(answers[d.id + "_" + i] ?? 0), 0);
      dim[d.id] = sum / d.q.length;
    });
    const lvl: Record<string, number> = {};
    LEVELS.forEach((l) => { lvl[l.id] = l.dims.reduce((s, d) => s + dim[d.id], 0) / l.dims.length; });
    const total = LEVELS.reduce((s, l) => s + lvl[l.id], 0) / LEVELS.length;
    return { dim, lvl, total };
  }, [answers]);

  const recommendation = useMemo(
    () => recommendHabit(scores.dim as Record<DimensionId, number>),
    [scores]
  );
  const lowestDim = DIMS.find((d) => d.id === recommendation.dimensionId) ?? DIMS[0];
  const lowestScore = scores.dim[recommendation.dimensionId] ?? 0;

  // Lista kontekstu: bazowe 4 pytania, a od drugiego pomiaru dochodzi piate ("co sie zmienilo").
  const CTX = hasPrior ? [...CONTEXT, CTX_ZMIANA] : CONTEXT;
  const TOTAL_CTX = CTX.length;
  const TOTAL_STEPS = 1 + TOTAL_DIM + TOTAL_CTX;

  const isIntro = step === 0;
  const isDim = step >= 1 && step <= TOTAL_DIM;
  const isCtx = step > TOTAL_DIM && step <= TOTAL_DIM + TOTAL_CTX;
  const isResult = step === TOTAL_STEPS;
  const pct = Math.round((step / TOTAL_STEPS) * 100);

  const dim = isDim ? DIMS[step - 1] : null;
  const ctx = isCtx ? CTX[step - TOTAL_DIM - 1] : null;
  const dimDone = dim ? dim.q.every((_q, i) => answers[dim.id + "_" + i] !== undefined) : false;
  const ctxDone = ctx ? (ctx.type === "scale" ? answers[ctx.id] !== undefined : String(answers[ctx.id] ?? "").trim().length > 0) : false;

  // RADAR (5 osi)
  const radar = useMemo(() => {
    const size = 260, cx = size / 2, cy = size / 2, R = 78, n = 5, a0 = -Math.PI / 2;
    const pt = (val: number, i: number): [number, number] => {
      const a = a0 + i * ((Math.PI * 2) / n); const r = (R * val) / 10;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const ring = (rr: number, i: number): [number, number] => {
      const a = a0 + i * ((Math.PI * 2) / n);
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
    };
    const rings = [1, 2, 3, 4, 5].map((k) => LEVELS.map((_l, i) => ring((R * k) / 5, i)).map((p) => p.join(",")).join(" "));
    const cur = LEVELS.map((l, i) => pt(scores.lvl[l.id], i));
    const axes = LEVELS.map((_l, i) => ring(R, i));
    const labels = LEVELS.map((l, i) => {
      const a = a0 + i * ((Math.PI * 2) / n);
      return {
        x: cx + Math.cos(a) * (R + 22),
        y: cy + Math.sin(a) * (R + 22),
        name: l.name === "Aktywność fizyczna" ? "Aktywność" : l.name,
        anchor: (Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle") as "start" | "end" | "middle",
      };
    });
    return { size, cx, cy, rings, cur, axes, labels };
  }, [scores]);

  const eyebrowStyle: CSSProperties = { fontSize: 10, letterSpacing: "0.28em", color: G.goldDeep, textTransform: "uppercase", fontWeight: 700, marginBottom: 12 };
  const navBtn: CSSProperties = { background: "transparent", border: "none", color: G.muted, cursor: "pointer", fontSize: 12, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 4, fontFamily: SANS, padding: "8px 4px" };
  const primaryBtn = (disabled: boolean): CSSProperties => ({ background: disabled ? "transparent" : G.ink, color: disabled ? G.muted : G.gold, border: disabled ? `1px solid ${G.border}` : "none", padding: "12px 26px", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer", fontFamily: SANS, fontWeight: 700 });

  const scaleRow = (key: string, val: number | string | undefined) => (
    <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((nn) => (
        <button key={nn} onClick={() => setAns(key, nn)}
          style={{ flex: 1, aspectRatio: "1/1", border: "none", borderRadius: 4, background: val === nn ? G.ink : G.bgWarm, color: val === nn ? G.gold : G.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS, padding: 0 }}>
          {nn}
        </button>
      ))}
    </div>
  );

  const handleFinish = async (useRecommended: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const context = {
        samopoczucie: answers["samopoczucie"] ?? null,
        cel: answers["cel"] ?? null,
        slowo: answers["slowo"] ?? null,
        transformacja: answers["transformacja"] ?? null,
        zmiana: answers["zmiana"] ?? null,
      };
      await recordHealthConsent();
      await saveAudit({
        dimensionScores: scores.dim,
        levelScores: scores.lvl,
        total: scores.total,
        context,
      });
      if (useRecommended) {
        const h = recommendation.habit;
        await setActiveHabitId(h.id);
        await upsertWeek({
          weekKey: weekKey(new Date()),
          habitPoolId: h.id,
          habitName: h.text,
          days: [0, 0, 0, 0, 0, 0, 0],
          weeklyTarget: h.weeklyTarget,
          weeklyScore: null,
          passed: null,
          isMaintenance: false,
          isCustom: false,
          reflection: null,
        });
      }
      navigate("/app", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się zapisać audytu. Spróbuj jeszcze raz.");
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div style={{ background: G.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontStyle: "italic", color: G.muted }}>
        Wczytywanie...
      </div>
    );
  }

  return (
    <div style={{ background: G.bg, minHeight: "100vh", fontFamily: SANS, color: G.ink, maxWidth: 480, margin: "0 auto" }}>
      <header style={{ background: G.ink, color: G.bg, borderBottom: `2px solid ${G.gold}`, padding: "13px 20px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, fontStyle: "italic", fontWeight: 500 }}>Twoja <span style={{ color: G.gold }}>Piramida.</span></div>
          {!isIntro && <div style={{ fontSize: 11, color: "rgba(253,252,248,0.5)", fontWeight: 600 }}>{pct}%</div>}
        </div>
        {!isIntro && (
          <div style={{ height: 3, background: "rgba(253,252,248,0.15)", borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: G.gold, borderRadius: 999, transition: "width 0.4s" }} />
          </div>
        )}
      </header>

      <main style={{ padding: "24px 20px 60px" }}>
        {isIntro && (
          <div>
            <div style={eyebrowStyle}>Diagnoza · Twój fundament</div>
            <div style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1.12, fontWeight: 500, marginBottom: 16 }}>
              Odkryj swoją<br /><span style={{ fontStyle: "italic", color: G.goldDeep }}>Piramidę Zdrowia.</span>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5f5e5a", marginBottom: 24 }}>
              40 pytań. Dowiesz się, w których obszarach zdrowia naprawdę działasz, a które tylko deklarujesz. Bez ściemniania. Na końcu dostaniesz konkretny pierwszy nawyk.
            </p>
            <div style={{ borderTop: `1px solid ${G.border}`, borderBottom: `1px solid ${G.border}`, padding: "18px 0", marginBottom: 24 }}>
              <div style={{ ...eyebrowStyle, marginBottom: 14 }}>Skala 1-10</div>
              {([["1-3", "daleko mi do tego"], ["4-6", "pracuję nad tym"], ["7-8", "w większości tak"], ["9-10", "mój solidny standard"]] as const).map(([r, d]) => (
                <div key={r} style={{ display: "flex", alignItems: "center", gap: 14, padding: "7px 0" }}>
                  <div style={{ background: G.ink, color: G.gold, fontWeight: 700, padding: "3px 10px", borderRadius: 999, fontSize: 11, minWidth: 48, textAlign: "center" }}>{r}</div>
                  <div style={{ fontSize: 14, color: "#5f5e5a" }}>{d}</div>
                </div>
              ))}
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18, cursor: "pointer" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2, accentColor: G.goldDeep, flexShrink: 0, cursor: "pointer" }} />
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "#5f5e5a" }}>
                Akceptuję <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" style={{ color: G.goldDeep, fontWeight: 600 }}>Regulamin</a> i <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" style={{ color: G.goldDeep, fontWeight: 600 }}>Politykę Prywatności</a> oraz wyrażam zgodę na przetwarzanie moich danych dotyczących zdrowia w celu działania audytu.
              </span>
            </label>
            <button onClick={() => { if (consent) setStep(1); }} disabled={!consent} style={{ ...primaryBtn(!consent), width: "100%", padding: 15 }}>Sprawdź się →</button>
            <div style={{ textAlign: "center", fontSize: 12, color: G.muted, marginTop: 12 }}>Około 8 minut</div>
          </div>
        )}

        {isDim && dim && (
          <div>
            <div style={eyebrowStyle}>Wymiar {step} z {TOTAL_DIM} · {dim.levelName}</div>
            <div style={{ fontFamily: SERIF, fontSize: 27, fontWeight: 500, lineHeight: 1.15, marginBottom: 22 }}>{dim.name}</div>
            {dim.q.map((qt, i) => {
              const key = dim.id + "_" + i;
              const val = answers[key];
              return (
                <div key={i} style={{ padding: "14px 0 14px 14px", borderLeft: `3px solid ${val !== undefined ? G.ink : G.border}`, marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</span>
                    <p style={{ fontSize: 15, lineHeight: 1.5, color: G.ink, margin: 0 }}>{qt}</p>
                  </div>
                  {scaleRow(key, val)}
                </div>
              );
            })}
          </div>
        )}

        {isCtx && ctx && (
          <div>
            <div style={eyebrowStyle}>Kontekst</div>
            <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, lineHeight: 1.2, marginBottom: 6 }}>{ctx.label}</div>
            <div style={{ fontSize: 13, color: G.muted, marginBottom: 18 }}>{ctx.helper}</div>
            {ctx.type === "scale" ? scaleRow(ctx.id, answers[ctx.id]) : (
              <textarea value={String(answers[ctx.id] ?? "")} onChange={(e) => setAns(ctx.id, e.target.value)} placeholder="Twoja odpowiedź..."
                style={{ width: "100%", minHeight: 110, padding: "14px 16px", fontFamily: SERIF, fontSize: 16, fontStyle: "italic", background: G.bgWarm, border: `1px solid ${G.border}`, outline: "none", resize: "vertical", color: G.ink, lineHeight: 1.5, boxSizing: "border-box" }} />
            )}
          </div>
        )}

        {isResult && (
          <div>
            <div style={{ ...eyebrowStyle, textAlign: "center" }}>Pomiar z dziś</div>
            <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500, textAlign: "center", lineHeight: 1.12, marginBottom: 24 }}>
              Twoja Piramida<br /><span style={{ fontStyle: "italic", color: G.goldDeep }}>na dziś.</span>
            </div>

            <div style={{ textAlign: "center", padding: "20px 0", borderTop: `1px solid ${G.ink}`, borderBottom: `1px solid ${G.ink}`, marginBottom: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: G.muted, marginBottom: 4 }}>Wynik ogólny</div>
              <div><span style={{ fontFamily: SERIF, fontSize: 60, fontWeight: 600, lineHeight: 1 }}>{scores.total.toFixed(1)}</span><span style={{ fontSize: 20, color: G.muted }}> / 10</span></div>
            </div>

            <div style={eyebrowStyle}>Kształt Piramidy</div>
            <svg viewBox={`0 0 ${radar.size} ${radar.size}`} style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto 24px" }}>
              {radar.rings.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke={G.border} strokeWidth="1" />)}
              {radar.axes.map((p, i) => <line key={i} x1={radar.cx} y1={radar.cy} x2={p[0]} y2={p[1]} stroke={G.border} strokeWidth="1" />)}
              <polygon points={radar.cur.map((p) => p.join(",")).join(" ")} fill="rgba(212,167,44,0.18)" stroke={G.gold} strokeWidth="2.5" />
              {radar.cur.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={G.gold} />)}
              {radar.labels.map((l, i) => <text key={i} x={l.x} y={l.y} textAnchor={l.anchor} dominantBaseline="middle" fontSize="10" fontWeight="600" fill="#5f5e5a" fontFamily={SANS}>{l.name}</text>)}
            </svg>

            <div style={eyebrowStyle}>Szczegółowy rozkład</div>
            {LEVELS.map((lvl, li) => (
              <div key={lvl.id} style={{ borderTop: `1px solid ${G.border}`, padding: "16px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500 }}>0{li + 1} · {lvl.name}</div>
                  <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600 }}>{scores.lvl[lvl.id].toFixed(1)}</div>
                </div>
                {lvl.dims.map((d) => {
                  const s = scores.dim[d.id];
                  const isLowest = d.id === recommendation.dimensionId;
                  return (
                    <div key={d.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: isLowest ? G.goldDeep : "#5f5e5a", fontWeight: isLowest ? 700 : 400 }}>{d.name}{isLowest ? " ←" : ""}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.toFixed(1)}</span>
                      </div>
                      <div style={{ height: 6, background: G.border, borderRadius: 999 }}>
                        <div style={{ height: "100%", width: (s / 10 * 100) + "%", background: isLowest ? G.gold : G.ink, borderRadius: 999, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ background: G.ink, color: G.bg, padding: "26px 22px", marginTop: 28 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.28em", color: G.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Twój pierwszy nawyk</div>
              <div style={{ fontSize: 13, color: "rgba(253,252,248,0.6)", marginBottom: 8 }}>
                Najsłabszy obszar: <span style={{ color: G.gold, fontWeight: 700 }}>{lowestDim.name}</span> ({lowestScore.toFixed(1)}/10)
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, lineHeight: 1.3, marginBottom: 18 }}>
                {recommendation.habit.text}
              </div>
              <div style={{ fontSize: 11, color: "rgba(253,252,248,0.4)", marginBottom: 20 }}>Ścieżka: {recommendation.path.name}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleFinish(true)} disabled={saving} style={{ flex: 2, background: G.gold, color: G.ink, border: "none", padding: 14, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: SANS, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Zapisuję..." : "Zacznij ten nawyk"}
                </button>
                <button onClick={() => handleFinish(false)} disabled={saving} style={{ flex: 1, background: "transparent", color: G.bg, border: `1px solid rgba(253,252,248,0.3)`, padding: 14, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: SANS }}>
                  Wybiorę sam
                </button>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button onClick={() => { setAnswers({}); setStep(0); }} disabled={saving} style={navBtn}>Zacznij od nowa</button>
            </div>
          </div>
        )}
      </main>

      {(isDim || isCtx) && (
        <div style={{ position: "sticky", bottom: 0, background: G.bg, borderTop: `1px solid ${G.border}`, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 480, margin: "0 auto" }}>
          <button onClick={() => setStep(step - 1)} style={navBtn}><ChevronLeft size={15} /> Wstecz</button>
          <button onClick={() => setStep(step + 1)} disabled={isDim ? !dimDone : !ctxDone} style={primaryBtn(isDim ? !dimDone : !ctxDone)}>
            {step === TOTAL_DIM + TOTAL_CTX ? "Zobacz wynik →" : "Dalej →"}
          </button>
        </div>
      )}
    </div>
  );
}
