export const contentTypeLabels: Record<string, string> = {
  game: "Игра",
  movie: "Фильм",
  series: "Сериал",
  anime: "Аниме",
  battle_rap: "Баттлрэп",
  music: "Музыка",
  irl: "ИРЛ",
  degrod: "Дегрод",
  videos: "Видео",
  unknown: "Невошедшее",
};

export const ratedContentTypes = new Set(["movie", "series", "anime"]);

export function isRatedContentType(contentType: string): boolean {
  return ratedContentTypes.has(contentType);
}

export const contentTypeTabs = [
  { label: "Все", value: "all" },
  { label: "Игры", value: "game" },
  { label: "Фильмы", value: "movie" },
  { label: "Сериалы", value: "series" },
  { label: "Аниме", value: "anime" },
  { label: "Баттлрэп", value: "battle_rap" },
  { label: "Дегрод", value: "degrod" },
  { label: "Музыка", value: "music" },
  { label: "ИРЛ", value: "irl" },
  { label: "Видео", value: "videos" },
  { label: "Невошедшее", value: "unknown" },
];

export const sortOptions = [
  { label: "По дате: новые сверху", value: "date_desc" },
  { label: "По дате: старые сверху", value: "date_asc" },
  { label: "По оценке: выше", value: "rating_desc" },
  { label: "По оценке: ниже", value: "rating_asc" },
  { label: "По названию: А → Я", value: "title_asc" },
  { label: "По названию: Я → А", value: "title_desc" },
];

export const battleRapPlatformFilters = [
  { label: "Кубок МЦ", value: "kbk" },
  { label: "SLOVO", value: "slovo" },
  { label: "RBL", value: "rbl" },
  { label: "140 BPM", value: "140" },
  { label: "Рвать на битах", value: "rnb" },
  { label: "Versus", value: "versus" },
  { label: "STRELASPB", value: "strela" },
  { label: "ЧСВ", value: "chsv" },
  { label: "Триплет", value: "triplet" },
  { label: "БЧБ", value: "bcb" },
];

export const battleRapEventsByPlatform: Record<
  string,
  { label: string; value: string }[]
> = {
  kbk: [
    { label: "Reborn", value: "kbk_reborn" },
    { label: "Summer Trip", value: "kbk_summer_trip" },
    { label: "New Era", value: "kbk_new_era" },
    { label: "Generation", value: "kbk_generation" },
    { label: "Backyard", value: "kbk_backyard" },
    { label: "Da Shift", value: "kbk_da_shift" },
    { label: "7", value: "kbk_7" },
    { label: "Infinity", value: "kbk_infinity" },
    { label: "Chains", value: "kbk_chains" },
    { label: "X", value: "kbk_x" },
    { label: "11", value: "kbk_11" },
    { label: "New Year", value: "kbk_ny" },
    { label: "XIII", value: "kbk_13" },
    { label: "Legacy pt. 1", value: "kbk_legacy_1" },
    { label: "Legacy pt. 2", value: "kbk_legacy_2" },
    { label: "KARMA", value: "kbk_karma" },
    { label: "MARCH", value: "kbk_march" },
    { label: "SLOVO", value: "kbk_slovo" },
    { label: "Ultimate", value: "kbk_ultimate" },
    { label: "Ultimate 2", value: "kbk_ultimate_2" },
    { label: "Off Season", value: "kbk_off_season" },
    { label: "Ultimate - Финал", value: "kbk_ultimate_final" },
    { label: "XX", value: "kbk_xx" },
    { label: "Summer Trap", value: "kbk_summer_trap" },
    { label: "XX 2", value: "kbk_xx_2" },
    { label: "XX 3", value: "kbk_xx_3" },
    { label: "Back to basics", value: "kbk_back_to_basics" },
    { label: "Соло Турнир", value: "kbk_solo_champ" },
    { label: "Турнир 2х2", value: "kbk_2_2" },
  ],
};

export const contentTypeColors: Record<
  string,
  { backgroundColor: string; border: string; color: string }
> = {
  game: {
    backgroundColor: "transparent",
    border: "1px solid #15803d",
    color: "#4ade80",
  },
  movie: {
    backgroundColor: "transparent",
    border: "1px solid #1d4ed8",
    color: "#60a5fa",
  },
  series: {
    backgroundColor: "transparent",
    border: "1px solid #7c3aed",
    color: "#a78bfa",
  },
  anime: {
    backgroundColor: "transparent",
    border: "1px solid #db2777",
    color: "#f472b6",
  },
  battle_rap: {
    backgroundColor: "transparent",
    border: "1px solid #b91c1c",
    color: "#f87171",
  },
  music: {
    backgroundColor: "transparent",
    border: "1px solid #b45309",
    color: "#fbbf24",
  },
  irl: {
    backgroundColor: "transparent",
    border: "1px solid #0891b2",
    color: "#22d3ee",
  },
  degrod: {
    backgroundColor: "transparent",
    border: "1px solid #c2410c",
    color: "#fb923c",
  },
  videos: {
    backgroundColor: "transparent",
    border: "1px solid #475569",
    color: "#cbd5e1",
  },
  unknown: {
    backgroundColor: "transparent",
    border: "1px solid #52525b",
    color: "#d4d4d8",
  },
};

export const sourceLabels: Record<string, string> = {
  boosty: "Boosty",
  telegram: "Telegram",
  youtube: "YouTube",
};

export const sourceIcons: Record<string, string> = {
  boosty: "/icons/boosty.svg",
  telegram: "/icons/telegram.svg",
  youtube: "/icons/youtube.svg",
};

export const sourceOrder = ["boosty", "youtube", "telegram"];
