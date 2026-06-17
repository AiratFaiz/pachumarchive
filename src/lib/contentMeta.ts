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
  { label: "По названию: А → Я", value: "title_asc" },
  { label: "По названию: Я → А", value: "title_desc" },
];

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
