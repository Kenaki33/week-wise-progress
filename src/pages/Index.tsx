import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { HabitTrackerApp } from "@/components/HabitTrackerApp";
import { supabase } from "@/integrations/supabase/client";
import { hasAudit } from "@/lib/jeden-nawyk/db";

// Brama: zalogowany BEZ audytu -> /onboarding. W innym wypadku -> apka.
// Nakladka, nie dotyka HabitTrackerApp.
type Gate = "checking" | "needs-onboarding" | "ready";

const Index = () => {
  const [gate, setGate] = useState<Gate>("checking");

  useEffect(() => {
    let active = true;

    const evaluate = async (hasSession: boolean) => {
      // Bez sesji puszczamy do HabitTrackerApp (tam jest ekran logowania).
      // Nie kierujemy wylogowanych na /onboarding (onboarding i tak by ich odbil).
      if (!hasSession) { if (active) setGate("ready"); return; }
      try {
        const done = await hasAudit();
        if (active) setGate(done ? "ready" : "needs-onboarding");
      } catch {
        // Jak zapytanie padnie, nie blokujemy apki.
        if (active) setGate("ready");
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (active) evaluate(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setGate("checking");
      evaluate(!!session);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (gate === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fdfcf8", fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", color: "#888780" }}>
        Wczytywanie...
      </div>
    );
  }

  if (gate === "needs-onboarding") return <Navigate to="/onboarding" replace />;

  return <HabitTrackerApp />;
};

export default Index;
