// ============================================================
// Jeden Nawyk - warstwa dostepu do Supabase
//
// Generowany Database (./types) nie zna jeszcze nowych tabel/kolumn po migracji.
// Izolujemy nietypowany dostep TUTAJ (db = supabase as any), a reszta apki
// korzysta wylacznie z ponizszych, otypowanych funkcji.
// Gdy kiedys zregenerujesz typy - wystarczy usunac "as any", nic wiecej.
// ============================================================

import { supabase } from "@/integrations/supabase/client";

// Jedyne miejsce z luznym typowaniem (nowe tabele: pyramid_audits, mastered_habits;
// nowe kolumny w habits/profiles).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ------------------------------------------------------------
// AUDYTY (pyramid_audits)
// ------------------------------------------------------------
export interface AuditInput {
  dimensionScores: Record<string, number>; // 12 wymiarow 0-10
  levelScores: Record<string, number>;     // 5 poziomow 0-10
  total: number;
  context?: Record<string, unknown> | null;
}
export interface AuditRow extends AuditInput {
  id: string;
  userId: string;
  createdAt: string;
}

function mapAudit(r: any): AuditRow {
  return {
    id: r.id,
    userId: r.user_id,
    createdAt: r.created_at,
    dimensionScores: r.dimension_scores ?? {},
    levelScores: r.level_scores ?? {},
    total: Number(r.total),
    context: r.context ?? null,
  };
}

export async function saveAudit(input: AuditInput): Promise<AuditRow> {
  const userId = await getUserId();
  if (!userId) throw new Error("Brak zalogowanego uzytkownika.");
  const { data, error } = await db
    .from("pyramid_audits")
    .insert({
      user_id: userId,
      dimension_scores: input.dimensionScores,
      level_scores: input.levelScores,
      total: input.total,
      context: input.context ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapAudit(data);
}

/** Ostatnie audyty, najnowszy pierwszy. limit=2 wystarcza do delty w Piramidzie. */
export async function getLatestAudits(limit = 2): Promise<AuditRow[]> {
  const { data, error } = await db
    .from("pyramid_audits")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapAudit);
}

/** Czy uzytkownik ma juz jakikolwiek audyt (brama onboardingu). */
export async function hasAudit(): Promise<boolean> {
  const { count, error } = await db
    .from("pyramid_audits")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ------------------------------------------------------------
// PROFIL - aktualny nawyk glowny (profiles.active_habit_pool_id)
// ------------------------------------------------------------
export async function getActiveHabitId(): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await db
    .from("profiles")
    .select("active_habit_pool_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.active_habit_pool_id ?? null;
}

export async function setActiveHabitId(habitPoolId: string | null): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Brak zalogowanego uzytkownika.");
  const { error } = await db
    .from("profiles")
    .update({ active_habit_pool_id: habitPoolId })
    .eq("user_id", userId);
  if (error) throw error;
}

// ------------------------------------------------------------
// POSTEP W SCIEZKACH (mastered_habits)
// ------------------------------------------------------------
export interface MasteredRow {
  pathId: string;
  levelIdx: number;                  // najwyzszy zdobyty krok (0-3)
  source: "earned" | "declared";     // wypracowany | opanowany z marszu
}

export async function getMastered(): Promise<MasteredRow[]> {
  const { data, error } = await db.from("mastered_habits").select("*");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    pathId: r.path_id,
    levelIdx: r.level_idx,
    source: r.source,
  }));
}

export async function upsertMastered(
  pathId: string,
  levelIdx: number,
  source: "earned" | "declared"
): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Brak zalogowanego uzytkownika.");
  const { error } = await db
    .from("mastered_habits")
    .upsert(
      {
        user_id: userId,
        path_id: pathId,
        level_idx: levelIdx,
        source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,path_id" }
    );
  if (error) throw error;
}

// ------------------------------------------------------------
// TYGODNIE NAWYKOW (habits) - per tydzien i per nawyk
// ------------------------------------------------------------
export interface WeekRow {
  id?: string;
  weekKey: string;                   // np. "2026-22"
  habitPoolId: string | null;        // id z puli lub "custom:..."; null tylko dla starych wierszy
  habitName: string | null;
  days: number[];                    // 7 stanow: 0 puste, 1 zrobione, 2 nie zrobione
  weeklyTarget: number;              // cel T
  weeklyScore: number | null;        // finalWeekScore (lub maintenanceScore) po zamknieciu
  passed: boolean | null;            // czy tydzien zaliczony (>=67%)
  isMaintenance: boolean;
  isCustom: boolean;
  reflection: string | null;
}

function mapWeek(r: any): WeekRow {
  return {
    id: r.id,
    weekKey: r.week_key,
    habitPoolId: r.habit_pool_id ?? null,
    habitName: r.habit_name ?? null,
    days: r.days ?? [0, 0, 0, 0, 0, 0, 0],
    weeklyTarget: r.weekly_target ?? 7,
    weeklyScore: r.weekly_score ?? null,
    passed: r.passed ?? null,
    isMaintenance: r.is_maintenance ?? false,
    isCustom: r.is_custom ?? false,
    reflection: r.reflection ?? null,
  };
}

/** Wszystkie nawyki danego tygodnia (glowny + utrzymaniowe). */
export async function getWeek(weekKey: string): Promise<WeekRow[]> {
  const { data, error } = await db.from("habit_weeks").select("*").eq("week_key", weekKey);
  if (error) throw error;
  return (data ?? []).map(mapWeek);
}

/** Historia jednego nawyku (po habit_pool_id) - do heatmap i logiki odblokowan. */
export async function getHabitHistory(habitPoolId: string): Promise<WeekRow[]> {
  const { data, error } = await db
    .from("habit_weeks")
    .select("*")
    .eq("habit_pool_id", habitPoolId)
    .order("week_key", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapWeek);
}

/** Wszystkie tygodnie zalogowanego uzytkownika (do liczenia np. ujemnych tygodni). */
export async function getMyWeeks(): Promise<WeekRow[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await db
    .from("habit_weeks")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map(mapWeek);
}

export async function upsertWeek(w: WeekRow): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Brak zalogowanego uzytkownika.");
  const { error } = await db.from("habit_weeks").upsert(
    {
      user_id: userId,
      week_key: w.weekKey,
      habit_pool_id: w.habitPoolId,
      habit_name: w.habitName ?? "",
      days: w.days,
      weekly_target: w.weeklyTarget,
      weekly_score: w.weeklyScore,
      passed: w.passed,
      is_maintenance: w.isMaintenance,
      is_custom: w.isCustom,
      reflection: w.reflection ?? "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_key,habit_pool_id" }
  );
  if (error) throw error;
}

// ------------------------------------------------------------
// RANKING - dane wszystkich uzytkownikow
// ------------------------------------------------------------
export interface RankWeek {
  userId: string;
  weekKey: string;
  days: number[];
  weeklyTarget: number;
  isMaintenance: boolean;
}

/** Bezpieczne dane tygodni wszystkich userow (przez funkcje SECURITY DEFINER). */
export async function getRankingWeeks(): Promise<RankWeek[]> {
  const { data, error } = await db.rpc("ranking_weeks");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    weekKey: r.week_key,
    days: r.days ?? [0, 0, 0, 0, 0, 0, 0],
    weeklyTarget: r.weekly_target ?? 7,
    isMaintenance: r.is_maintenance ?? false,
  }));
}

export interface ProfileRow {
  userId: string;
  nickname: string | null;
  personality: string | null;
}

/** Profile wszystkich userow (do nicku i osobowosci w rankingu). */
export async function getAllProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await db.from("profiles").select("user_id, nickname, nutrition_personality");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    nickname: r.nickname ?? null,
    personality: r.nutrition_personality ?? null,
  }));
}

// ------------------------------------------------------------
// ADMIN - podglad danych konkretnej osoby (tylko dla is_admin)
// ------------------------------------------------------------
/** Czy zalogowany uzytkownik jest adminem (profiles.is_admin). */
export async function getIsAdmin(): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  try {
    const { data, error } = await db
      .from("profiles")
      .select("is_admin")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return false;
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

/** Pomiary wskazanej osoby (przez funkcje SECURITY DEFINER z kontrola admina). */
export async function adminGetAudits(targetUserId: string): Promise<AuditRow[]> {
  const { data, error } = await db.rpc("admin_get_audits", { target: targetUserId });
  if (error) throw error;
  return (data ?? []).map(mapAudit);
}

/** Tygodnie nawykow wskazanej osoby (przez funkcje SECURITY DEFINER z kontrola admina). */
export async function adminGetWeeks(targetUserId: string): Promise<WeekRow[]> {
  const { data, error } = await db.rpc("admin_get_weeks", { target: targetUserId });
  if (error) throw error;
  return (data ?? []).map(mapWeek);
}

// ------------------------------------------------------------
// ZGODA NA DANE ZDROWOTNE (profiles.health_consent_at)
// ------------------------------------------------------------

/** Czy uzytkownik wyrazil juz zgode na przetwarzanie danych zdrowotnych. */
export async function hasHealthConsent(): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  try {
    const { data, error } = await db
      .from("profiles")
      .select("health_consent_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return false;
    return !!data?.health_consent_at;
  } catch {
    return false;
  }
}

/** Zapisuje moment zgody (tylko raz - zachowuje pierwsza date). */
export async function recordHealthConsent(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await db
      .from("profiles")
      .update({ health_consent_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("health_consent_at", null);
  } catch (e) {
    console.error(e);
  }
}
