"use client";

import { useMemo, useState } from "react";
import type { ContentItem } from "@/lib/googleSheet";

type Props = {
  items: ContentItem[];
};

const tabs = [
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

const tagLabels: Record<string, string> = {
  kbk: "Кубок МЦ",
  rbl: "RBL",
  slovo: "SLOVO",
  versus: "VERSUS",
  strela: "STRELASPB",
  retro: "Ретроспектива",
  rnb: "Рвать на битах",
  bcb: "БЧБ",
  chsv: "ЧСВ",
  triplet: "Триплет",
  lynch: "Lynch Battle",
  drago: "Драго",
  battle_rap: "Баттл-рэп",
  zlovo: "Zlovo",

  re: "Resident Evil",
  dark_souls: "Dark Souls",
  demon_souls: "Demon's Souls",
  kcd: "Kingdom Come",
  gta: "GTA",
  fifa: "FIFA",
  minecraft: "Minecraft",
  cs: "Counter-Strike",
  au: "Among Us",

  bv16: "Беременна в 16 (Мама в 16)",
  razved: "Немножко разведены",
  pacanki: "Пацанки",
  m_zh: "Мужское / Женское",

  auction: "Аукцион",
  degrod: "Дегрод",
  game: "Игра",
  movie: "Фильм",
  series: "Сериал",
  music: "Музыка",
  irl: "ИРЛ",
  videos: "Видео",
  anime: "Аниме",
  tier_list: "Тир-лист",
  quiz: "Тест",
  coop: "Кооп",
  requested: "Заказы",
  exile: "Эксайл",
  best: "Хайлайты",
  sverh: "Сверхъестественное",
  got: "Игра престолов",
  sw: "Звездные войны",
  bb: "Во все тяжкие",
  lotr: "Властелин колец",
  arcane: "Аркейн",
  aang: "Аватар: Легенда об Аанге",
  chainsaw_man: "Человек-бензопила",
  sg: "Игра в кальмара",
  saw: "Пила",
  hp: "Гарри Поттер",
  tlou: "Одни из нас",
  st: "Очень странные дела",
  br_main: "Баттл-рэп: главное ",
  bd: "1 декабря, ДР Пачума",
  comedy_table: "Comedy Table",
  twd: "Ходячие мертвецы",
  "007": "007",
  "140": "140 BPM",
  wed: "4 свадьбы",
  naruto: "Наруто",
  daredevil: "Сорвиголова",
  pens: "Пенсионеры",
  baki: "Боец Баки",
  opm: "Ванпанчмен",
  basilisk: "Василиск",
  link_click: "Агент времени",
  tog: "Башня Бога",
  haikyu: "Волейбол!",
  kaguya: "Госпожа Кагуя",
  gurren: "Гуррен Лаганн",
  dan: "Дандандан",
  jojo: "ДжоДжо",
  demon_slayer: "Клинок рассекающий демонов",
  bibop: "Ковбой Бибоп",
  geass: "Код гиас",
  konosuba: "Коносуба",
  jujutsu: "Магическая битва",
  mashle: "Магия и мускулы",
  aot: "Оборона малышей",
  gbd: "Необъятный океан",
  tpn: "Обещанный Неверленд",
  b_lagoon: "Пираты черной лагуны",
  champloo: "Самурай Чамплу",
  spy_family: "Семья Шпиона",
  fullmetal: "Стальной алхимик",
  death_note: "Тетрадь смерти"
};

function getTagLabel(tag: string): string {
  return tagLabels[tag] ?? tag;
}

function formatDate(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("ru-RU");
}

function matchesPlatform(item: ContentItem, platform: string): boolean {
  if (platform === "all") return true;
  if (platform === "youtube") return Boolean(item.youtubeUrl);
  if (platform === "telegram") return Boolean(item.telegramUrl);
  if (platform === "boosty") return Boolean(item.boostyUrl);

  return true;
}

export function ContentSearch({ items }: Props) {
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");

  const itemsForTagFilter = useMemo(() => {
    return items.filter((item) => {
      const matchesTab =
        selectedTab === "all" || item.contentType === selectedTab;

      return matchesTab && matchesPlatform(item, selectedPlatform);
    });
  }, [items, selectedTab, selectedPlatform]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();

    itemsForTagFilter.forEach((item) => {
      item.tags.forEach((tag) => tags.add(tag));
    });

    return Array.from(tags).sort((a, b) =>
      getTagLabel(a).localeCompare(getTagLabel(b), "ru")
    );
  }, [itemsForTagFilter]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesTab =
        selectedTab === "all" || item.contentType === selectedTab;

      const platformOk = matchesPlatform(item, selectedPlatform);

      const matchesTag =
        selectedTag === "all" || item.tags.includes(selectedTag);

      const text = [
        item.title,
        item.contentType,
        item.rating,
        item.firstDate,
        item.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || text.includes(query);

      return matchesTab && platformOk && matchesTag && matchesSearch;
    });
  }, [items, search, selectedTab, selectedPlatform, selectedTag]);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setSelectedTab(tab.value);
              setSelectedTag("all");
            }}
            className={`rounded-xl px-5 py-3 text-base font-medium transition ${
              selectedTab === tab.value
                ? "bg-white text-zinc-950"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={
          selectedTab === "game"
            ? "Введите название игры..."
            : "Введите название контента..."
        }
        className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-zinc-400"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={selectedPlatform}
          onChange={(event) => {
            setSelectedPlatform(event.target.value);
            setSelectedTag("all");
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        >
          <option value="all">Все площадки</option>
          <option value="youtube">YouTube</option>
          <option value="telegram">Telegram</option>
          <option value="boosty">Boosty</option>
        </select>

        <select
          value={selectedTag}
          onChange={(event) => setSelectedTag(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        >
          <option value="all">Все теги</option>

          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {getTagLabel(tag)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 text-sm text-zinc-500">
        Найдено: {filteredItems.length}
      </div>

      <div className="mt-6 space-y-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{item.title}</h2>

                <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-400">
                  {item.contentType && (
                    <span className="font-medium">{item.contentType}</span>
                  )}
                  {item.firstDate && <span>• {formatDate(item.firstDate)}</span>}
                </div>
              </div>

              {item.rating && (
                <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-sm">
                  {item.rating}/10
                </span>
              )}
            </div>

            {item.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                  >
                    {getTagLabel(tag)}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-4 text-sm">
              {item.youtubeUrl && (
                <a
                  href={item.youtubeUrl}
                  target="_blank"
                  className="text-red-400 hover:text-red-300"
                >
                  YouTube
                </a>
              )}

              {item.telegramUrl && (
                <a
                  href={item.telegramUrl}
                  target="_blank"
                  className="text-sky-400 hover:text-sky-300"
                >
                  Telegram
                </a>
              )}

              {item.boostyUrl && (
                <a
                  href={item.boostyUrl}
                  target="_blank"
                  className="text-orange-400 hover:text-orange-300"
                >
                  Boosty
                </a>
              )}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
            Ничего не найдено. Возможно, это ещё не смотрели.
          </div>
        )}
      </div>
    </>
  );
}