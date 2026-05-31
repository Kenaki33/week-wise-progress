// ============================================================
// Jeden Nawyk - pula nawyków (źródło prawdy)
// 5 poziomów Piramidy · 12 wymiarów · 23 ścieżki · 92 nawyki
// ============================================================

export type Difficulty = 0 | 1 | 2 | 3; // łatwy, średni, średni, trudny
export const DIFFICULTY_LABEL = ["łatwy", "średni", "średni", "trudny"] as const;

export type DimensionId =
  | "narracja" | "spojnosc"            // Tożsamość
  | "swiadomosc" | "regularnosc" | "relacja" // Odżywianie
  | "sila" | "wydolnosc" | "mobilnosc"       // Aktywność
  | "sen" | "stres"                     // Regeneracja
  | "badania" | "suplementacja";        // Optymalizacja

export interface PoolHabit {
  id: string;            // np. "nawodnienie-1"
  text: string;
  difficulty: Difficulty;
  weeklyTarget: number;  // T: ile razy w tygodniu (7 = codziennie)
}
export interface PoolPath {
  id: string;
  name: string;
  dimensionId: DimensionId;
  levelId: string;
  habits: PoolHabit[];
}
export interface PoolLevel {
  id: string;
  n: string;   // "01".."05"
  name: string;
  paths: PoolPath[];
}

// Kompaktowy format wejściowy: [tekst, trudność, cel T]
type RawHabit = [string, Difficulty, number];
interface RawPath { id: string; name: string; dimensionId: DimensionId; habits: RawHabit[]; }
interface RawLevel { id: string; n: string; name: string; paths: RawPath[]; }

const RAW: RawLevel[] = [
  { id: "tozsamosc", n: "01", name: "Tożsamość", paths: [
    { id: "praktyka-poranna", name: "Praktyka poranna", dimensionId: "narracja", habits: [
      ["Rano, przed telefonem, czytam na głos zdanie tożsamościowe", 0, 7],
      ["Każdego ranka 3 minuty siedzę w ciszy bez telefonu", 1, 7],
      ["Codziennie zapisuję 3 rzeczy, za które jestem wdzięczny", 1, 7],
      ["Codziennie 10 minut journala odręcznego", 3, 7],
    ]},
    { id: "cel-i-kierunek", name: "Cel i kierunek", dimensionId: "spojnosc", habits: [
      ["Rano czytam swoje 'dlaczego' (jedno zdanie)", 0, 7],
      ["Rano wybieram i zapisuję 1 najważniejsze zadanie dnia", 1, 7],
      ["Wieczorem zapisuję jedno małe zwycięstwo dnia", 1, 7],
      ["Niedzielny 15-min przegląd tygodnia", 3, 1],
    ]},
    { id: "srodowisko-relacje", name: "Środowisko i relacje", dimensionId: "spojnosc", habits: [
      ["Wieczorem przygotowuję 1 rzecz wspierającą jutrzejszy zdrowy wybór", 0, 7],
      ["Codziennie chowam z zasięgu wzroku 1 pokusę", 1, 7],
      ["Codziennie 1 moment obecności z bliską osobą bez telefonu (15 min)", 1, 7],
      ["Codziennie kontakt z osobą, która wspiera moje zmiany", 3, 7],
    ]},
  ]},
  { id: "odzywianie", n: "02", name: "Odżywianie", paths: [
    { id: "nawodnienie", name: "Nawodnienie", dimensionId: "swiadomosc", habits: [
      ["Wieczorem stawiam szklankę 250ml wody obok łóżka, wypijam po przebudzeniu", 0, 7],
      ["Butelka 1,5 L przy miejscu pracy, wypijam w trakcie pracy", 1, 7],
      ["Przed każdą kawą wypijam szklankę wody", 1, 7],
      ["2,5 L płynów bezkalorycznych dziennie (woda, herbata ziołowa)", 3, 7],
    ]},
    { id: "bialko", name: "Białko", dimensionId: "swiadomosc", habits: [
      ["Pierwszy posiłek dnia zawiera źródło białka", 0, 7],
      ["Każdy główny posiłek ma porcję białka wielkości dłoni", 1, 7],
      ["Codziennie ok. 100g białka", 1, 7],
      ["Ok. 1,6g białka na kg masy ciała", 3, 7],
    ]},
    { id: "warzywa", name: "Warzywa i błonnik", dimensionId: "swiadomosc", habits: [
      ["Do obiadu dodaję porcję warzyw", 0, 7],
      ["W każdym głównym posiłku są warzywa (min. garść)", 1, 7],
      ["Codziennie min. 400g warzyw i owoców", 1, 7],
      ["Codziennie warzywa i owoce w min. 4 kolorach", 3, 7],
    ]},
    { id: "mniej-cukru", name: "Mniej cukru i przetworzonego", dimensionId: "swiadomosc", habits: [
      ["Cały dzień bez słodkich napojów", 0, 7],
      ["Bez słodyczy i słonych przekąsek między posiłkami", 1, 7],
      ["Czytam skład, nie kupuję jeśli cukier w 3 pierwszych składnikach", 1, 7],
      ["80% dnia to produkty nieprzetworzone", 3, 7],
    ]},
    { id: "stabilna-energia", name: "Stabilna energia", dimensionId: "regularnosc", habits: [
      ["Białkowe śniadanie (nie samo pieczywo/słodkie płatki)", 0, 7],
      ["3 posiłki o stałych porach, bez podjadania", 1, 7],
      ["Po każdym większym posiłku 10-min spacer", 1, 7],
      ["Ostatni posiłek 3h przed snem, okno 10h", 3, 7],
    ]},
    { id: "uwazne-jedzenie", name: "Uważne jedzenie", dimensionId: "relacja", habits: [
      ["Każdy główny posiłek przy stole, nie przy biurku", 0, 7],
      ["Podczas posiłku telefon ekranem w dół / poza zasięgiem", 1, 7],
      ["Każdy główny posiłek min. 15 minut", 1, 7],
      ["W połowie posiłku przerwa, sprawdzam głód", 3, 7],
    ]},
    { id: "alkohol", name: "Alkohol", dimensionId: "relacja", habits: [
      ["W dni powszednie (pon-czw) nie piję alkoholu", 0, 4],
      ["Każdą porcję alkoholu popijam wodą 1:1", 1, 7],
      ["Minimum 6 dni w tygodniu bez alkoholu", 1, 6],
      ["Cały tydzień bez alkoholu", 3, 7],
    ]},
  ]},
  { id: "aktywnosc", n: "03", name: "Aktywność fizyczna", paths: [
    { id: "trening-silowy", name: "Trening siłowy", dimensionId: "sila", habits: [
      ["Codziennie 20 przysiadów i 10 pompek", 0, 7],
      ["2× w tygodniu trening całego ciała min. 20 min", 1, 2],
      ["3× w tygodniu trening min. 40 min", 1, 3],
      ["3× w tygodniu trening z progresją (zapisuję)", 3, 3],
    ]},
    { id: "ruch-codzienny", name: "Ruch codzienny (kroki)", dimensionId: "wydolnosc", habits: [
      ["Codziennie min. 6 000 kroków", 0, 7],
      ["Codziennie min. 8 000 kroków", 1, 7],
      ["Codziennie min. 10 000 kroków", 1, 7],
      ["Min. 10 000 kroków, nie siedzę dłużej niż 60 min bez wstania", 3, 7],
    ]},
    { id: "cardio", name: "Cardio (Zone 2 + interwały)", dimensionId: "wydolnosc", habits: [
      ["1× w tygodniu 20 min marszu lub roweru", 0, 1],
      ["2× w tygodniu 30 min Zone 2", 1, 2],
      ["3× cardio w tygodniu (2× Zone 2 + 1× interwały)", 1, 3],
      ["150 min ruchu tlenowego w tygodniu (samo-check)", 3, 1],
    ]},
    { id: "mobilnosc-postawa", name: "Mobilność i postawa", dimensionId: "mobilnosc", habits: [
      ["Co godzinę wstaję, 10 przysiadów lub krążenia ramion", 0, 7],
      ["Rano 5 min rozciągania bioder i klatki", 1, 7],
      ["Codziennie 10 min mobilności", 1, 7],
      ["1× w tygodniu sesja jogi/mobilności 30 min", 3, 1],
    ]},
  ]},
  { id: "regeneracja", n: "04", name: "Regeneracja", paths: [
    { id: "higiena-snu", name: "Higiena snu", dimensionId: "sen", habits: [
      ["Kładę się do łóżka przed 23:30", 0, 7],
      ["Brak ekranów min. 30 min przed snem", 1, 7],
      ["Telefon ładuje się poza sypialnią", 1, 7],
      ["Stała godzina pobudki ±30 min, też w weekendy", 3, 7],
    ]},
    { id: "oddech-wyciszenie", name: "Oddech i wyciszenie", dimensionId: "stres", habits: [
      ["3× dziennie 1 min świadomego oddechu", 0, 7],
      ["Codziennie 5 min ćwiczeń oddechowych", 1, 7],
      ["Codziennie 10 min medytacji prowadzonej", 1, 7],
      ["Codziennie 20 min praktyki regeneracyjnej", 3, 7],
    ]},
    { id: "granice-praca-zycie", name: "Granice praca-życie", dimensionId: "stres", habits: [
      ["Po pracy gest 'końca pracy'", 0, 7],
      ["Bez służbowej poczty po 19:00", 1, 7],
      ["Codziennie 1h wieczorem bez ekranów", 1, 7],
      ["1 dzień w tygodniu offline od pracy", 3, 1],
    ]},
    { id: "detoks-cyfrowy", name: "Detoks cyfrowy", dimensionId: "stres", habits: [
      ["Pierwsze 30 min po przebudzeniu bez telefonu", 0, 7],
      ["Powiadomienia social wyłączone na cały dzień", 1, 7],
      ["1 dzień w tygodniu bez social mediów", 1, 1],
      ["Max 1h dziennie w social", 3, 7],
    ]},
  ]},
  { id: "optymalizacja", n: "05", name: "Optymalizacja", paths: [
    { id: "monitorowanie-ciala", name: "Monitorowanie ciała", dimensionId: "badania", habits: [
      ["Wieczorem oceniam energię dnia (1-10)", 0, 7],
      ["Rano mierzę tętno spoczynkowe", 1, 7],
      ["Co tydzień ważenie (piątek rano)", 1, 1],
      ["Codziennie zapisuję sen, energię, samopoczucie", 3, 7],
    ]},
    { id: "swiatlo-natura", name: "Światło i natura", dimensionId: "badania", habits: [
      ["Rano 10 min na świetle dziennym", 0, 7],
      ["Min. 20 min na świeżym powietrzu dziennie", 1, 7],
      ["1× w tygodniu spacer w naturze 30 min", 1, 1],
      ["1× w tygodniu wyjście w naturę 90 min", 3, 1],
    ]},
    { id: "kofeina", name: "Kofeina", dimensionId: "suplementacja", habits: [
      ["Pierwsza kawa 1,5h po przebudzeniu", 0, 7],
      ["Ostatnia kawa do 14:00", 1, 7],
      ["Max 3 kawy dziennie", 1, 7],
      ["Max 2 kawy, ostatnia do 12:00", 3, 7],
    ]},
    { id: "suplementacja", name: "Suplementacja", dimensionId: "suplementacja", habits: [
      ["Rano witamina D3 + K2 (sezonowo IX-IV)", 0, 7],
      ["Jedna kapsułka omega-3 do dowolnego posiłku", 1, 7],
      ["Magnez wieczorem", 1, 7],
      ["Pełny protokół: D3, omega-3, magnez + kreatyna (zdrowe nerki)", 3, 7],
    ]},
    { id: "termoterapia", name: "Termoterapia i zimno", dimensionId: "suplementacja", habits: [
      ["30 sek zimnej wody na końcu prysznica", 0, 7],
      ["Codziennie zimny prysznic min. 2 min", 1, 7],
      ["1× w tygodniu sauna min. 20 min", 1, 1],
      ["Kontrastowy prysznic 2 min", 3, 7],
    ]},
  ]},
];

// Rozwinięcie do pełnych obiektów ze stabilnymi id nawyków
export const POOL: PoolLevel[] = RAW.map((lvl) => ({
  id: lvl.id, n: lvl.n, name: lvl.name,
  paths: lvl.paths.map((p) => ({
    id: p.id, name: p.name, dimensionId: p.dimensionId, levelId: lvl.id,
    habits: p.habits.map((h, i) => ({ id: `${p.id}-${i + 1}`, text: h[0], difficulty: h[1], weeklyTarget: h[2] })),
  })),
}));

// Płaskie indeksy pomocnicze
export const ALL_PATHS: PoolPath[] = POOL.flatMap((l) => l.paths);
export const ALL_HABITS: PoolHabit[] = ALL_PATHS.flatMap((p) => p.habits);

export function getPath(pathId: string): PoolPath | undefined {
  return ALL_PATHS.find((p) => p.id === pathId);
}
export function getHabit(habitId: string): PoolHabit | undefined {
  return ALL_HABITS.find((h) => h.id === habitId);
}
export function getPathOfHabit(habitId: string): PoolPath | undefined {
  return ALL_PATHS.find((p) => p.habits.some((h) => h.id === habitId));
}

// ============================================================
// Mapowanie audyt → rekomendacja (spec sekcja 6)
// Każdy wymiar -> domyślna ścieżka. Tie-break: niższy poziom piramidy.
// ============================================================
export const RECOMMEND_BY_DIMENSION: Record<DimensionId, string> = {
  narracja: "praktyka-poranna",
  spojnosc: "cel-i-kierunek",
  swiadomosc: "nawodnienie",
  regularnosc: "stabilna-energia",
  relacja: "uwazne-jedzenie",
  sila: "trening-silowy",
  wydolnosc: "ruch-codzienny",
  mobilnosc: "mobilnosc-postawa",
  sen: "higiena-snu",
  stres: "oddech-wyciszenie",
  badania: "monitorowanie-ciala",
  suplementacja: "suplementacja",
};

// Kolejność = piramida (niższy poziom pierwszy) -> używana do tie-breaku
export const DIMENSION_ORDER: DimensionId[] = [
  "narracja", "spojnosc",
  "swiadomosc", "regularnosc", "relacja",
  "sila", "wydolnosc", "mobilnosc",
  "sen", "stres",
  "badania", "suplementacja",
];

export interface Recommendation {
  dimensionId: DimensionId;
  dimensionScore: number;
  path: PoolPath;
  habit: PoolHabit; // pierwszy (najłatwiejszy) nawyk ścieżki
}

/**
 * Zwraca rekomendowany pierwszy nawyk na podstawie wyników audytu.
 * Wybiera najniższy wymiar; przy remisie preferuje niższy poziom piramidy
 * (dzięki iteracji w DIMENSION_ORDER ze ścisłym "<").
 */
export function recommendHabit(dimensionScores: Record<DimensionId, number>): Recommendation {
  let lowest: DimensionId = DIMENSION_ORDER[0];
  for (const d of DIMENSION_ORDER) {
    if ((dimensionScores[d] ?? 10) < (dimensionScores[lowest] ?? 10) - 1e-9) lowest = d;
  }
  const path = getPath(RECOMMEND_BY_DIMENSION[lowest])!;
  return { dimensionId: lowest, dimensionScore: dimensionScores[lowest] ?? 0, path, habit: path.habits[0] };
}
