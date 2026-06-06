import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthPage } from "@/components/auth/AuthPage";
import JedenNawykApp from "@/pages/JedenNawykApp";
import { supabase } from "@/integrations/supabase/client";
import { hasAudit } from "@/lib/jeden-nawyk/db";

// Glowny adres "/" = nowa apka.
// Niezalogowany -> ekran logowania (AuthPage). Zalogowany bez audytu -> /onboarding.
// Zalogowany z audytem -> nowa apka.
type Gate = "loading" | "auth" | "onboarding" | "app";

const Index = () => {
  const [gate, setGate] = useState<Gate>("loading");

  useEffect(() => {
    let active = true;

    const evaluate = async (hasSession: boolean) => {
      if (!hasSession) { if (active) setGate("auth"); return; }
      try {
        const done = await hasAudit();
        if (active) setGate(done ? "app" : "onboarding");
      } catch {
        // Jak zapytanie padnie, nie blokujemy apki.
        if (active) setGate("app");
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (active) evaluate(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setGate("loading");
      evaluate(!!session);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (gate === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fdfcf8", fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", color: "#888780" }}>
        Wczytywanie...
      </div>
    );
  }
  if (gate === "auth") return <AuthPage />;
  if (gate === "onboarding") return <Navigate to="/onboarding" replace />;
  return <JedenNawykApp />;
};

export default Index;
