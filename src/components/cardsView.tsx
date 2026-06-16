"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentCard, ContentSourceItem } from "@/lib/contentCards";
import Image from "next/image";
import { getTagLabel } from "@/lib/tagLabels";

type Props = {
  cards: ContentCard[];
};

const typeLabels: Record<string, string> = {
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

const sortOptions = [
  { label: "По дате: новые сверху", value: "date_desc" },
  { label: "По дате: старые сверху", value: "date_asc" },
  { label: "По названию: А → Я", value: "title_asc" },
  { label: "По названию: Я → А", value: "title_desc" },
];

const typeColors: Record<
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

const sourceLabels: Record<string, string> = {
  boosty: "Boosty",
  telegram: "Telegram",
  youtube: "YouTube",
};

const sourceIcons: Record<string, string> = {
  boosty: "/icons/boosty.svg",
  telegram: "/icons/telegram.svg",
  youtube: "/icons/youtube.svg",
};

function getItemSource(item: ContentSourceItem): string {
  if (item.boostyUrl) return "boosty";
  if (item.telegramUrl) return "telegram";
  if (item.youtubeUrl) return "youtube";
  return "other";
}

function getItemUrl(item: ContentSourceItem): string {
  return item.boostyUrl || item.telegramUrl || item.youtubeUrl || "#";
}

function getCardMaxDate(card: ContentCard): number {
  return Math.max(
    ...card.items.map((item) => {
      const value = item.lastDate || item.firstDate;
      const time = new Date(value).getTime();

      return Number.isNaN(time) ? 0 : time;
    }),
    0
  );
}

function cardMatchesPlatform(card: ContentCard, platform: string): boolean {
  if (platform === "all") return true;

  return card.items.some((item) => getItemSource(item) === platform);
}

function getFilteredCardItems(
  card: ContentCard,
  platform: string
): ContentSourceItem[] {
  if (platform === "all") return card.items;

  return card.items.filter((item) => getItemSource(item) === platform);
}

function groupBySource(items: ContentSourceItem[]) {
  return items.reduce<Record<string, ContentSourceItem[]>>((acc, item) => {
    const source = getItemSource(item);
    if (!acc[source]) acc[source] = [];
    acc[source].push(item);
    return acc;
  }, {});
}

function formatDuration(hours: string): string {
  if (!hours) return "";

  const num = Number(hours);

  if (Number.isNaN(num)) return hours;
  if (num < 1) return `${Math.round(num * 60)} мин`;

  return `${num.toFixed(1)} ч`;
}

function hasValidDuration(hours: string): boolean {
  const num = Number(hours);

  return !Number.isNaN(num) && num > 0;
}

function formatDate(value: string): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("ru-RU");
}

function SourceIcon({ source }: { source: string }) {
  const icon = sourceIcons[source];

  if (!icon) return null;

  return (
    <Image
      src={icon}
      alt=""
      width={20}
      height={20}
      className="h-[20px] w-[20px] shrink-0"
    />
  );
}

function ExternalLinkIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <Image
      src="/icons/external_link.svg"
      alt=""
      width={30}
      height={30}
      className={className}
    />
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <Image
      src={isOpen ? "/icons/chevron_up.svg" : "/icons/chevron_down.svg"}
      alt=""
      width={25}
      height={25}
      className="h-4 w-4"
    />
  );
}

function ExpandIcon({
  isOpen,
  className = "h-4 w-4",
}: {
  isOpen: boolean;
  className?: string;
}) {
  return (
    <Image
      src={isOpen ? "/icons/chevron_up.svg" : "/icons/chevron_down.svg"}
      alt=""
      width={16}
      height={16}
      className={className}
    />
  );
}

function InfoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <Image
      src="/icons/info.svg"
      alt=""
      width={24}
      height={24}
      className={className}
      style={{
        filter: "invert(1)",
        opacity: 0.68,
      }}
    />
  );
}

function getCardLatestDate(card: ContentCard): string {
  const dates = card.items
    .map((item) => item.lastDate || item.firstDate)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return dates[0] ?? "";
}

function SourceLink({ item }: { item: ContentSourceItem }) {
  const source = getItemSource(item);
  const url = getItemUrl(item);

  return (
    <a
      href={url}
      target="_blank"
      className="block rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-600"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="min-w-0">
            {sourceLabels[source] ?? source}
            {item.firstDate && (
              <span className="ml-2 text-zinc-600">
                · {formatDate(item.firstDate)}
              </span>
            )}
          </div>

          <div className="mt-1 text-base font-semibold">
            {item.title}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-sm text-zinc-400">
          {hasValidDuration(item.durationHours) && (
            <span className="whitespace-nowrap">
                {formatDuration(item.durationHours)}
            </span>
          )}
            <div className="flex h-8 w-8 items-center justify-center text-zinc-500">
                <ExternalLinkIcon className="h-5 w-5" />
            </div>
        </div>
      </div>
    </a>
  );
}

function CardMaterials({ card }: { card: ContentCard }) {
  const [openSource, setOpenSource] = useState<string | null>(null);

  const grouped = groupBySource(card.items);
  const sourceEntries = Object.entries(grouped);

  const shouldGroupBySource =
    sourceEntries.length > 1 &&
    sourceEntries.some(([, items]) => items.length > 1);

  if (!shouldGroupBySource) {
    return (
      <div className="mt-5 space-y-3">
        {card.items.map((item) => (
          <SourceLink key={item.contentId} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {sourceEntries.map(([source, items]) => {
        const isOpen = openSource === source;

        return (
          <div
            key={source}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/40"
          >
            <button
              type="button"
              onClick={() => setOpenSource(isOpen ? null : source)}
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
            >
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold">
                    <SourceIcon source={source} />
                    {sourceLabels[source] ?? source}
                </div>

                <div className="mt-1 text-sm text-zinc-500">
                  {items.length} материалов
                </div>
              </div>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500">
                <ExpandIcon isOpen={isOpen} className="h-3.5 w-3.5" />
              </div>
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-zinc-800 p-4">
                {items.map((item) => (
                  <SourceLink key={item.contentId} item={item} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatPill({
  value,
  label,
  icon,
  style,
}: {
  value: number;
  label: string;
  icon: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={{ ...style, width: 170, height: 66 }}
      className="flex items-center gap-3 rounded-2xl border px-4 py-3"
    >
      <Image
        src={icon}
        alt=""
        width={30}
        height={30}
        style={{
          filter: "invert(1)",
          opacity: 0.68,
        }}
        className="shrink-0"
      />

      <div className="flex flex-col justify-center leading-none">
        <div className="text-2xl font-bold text-zinc-100">
          {value}
        </div>

        <div className="mt-1 text-sm text-zinc-400">
          {label}
        </div>
      </div>
    </div>
  );
}

export function CardsView({ cards }: Props) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  // const [selectedTag, setSelectedTag] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");

    /*
  const cardsForTagFilter = useMemo(() => {
    return cards.filter((card) => {
      const matchesTab =
        selectedTab === "all" || card.contentType === selectedTab;

      return matchesTab && cardMatchesPlatform(card, selectedPlatform);
    });
  }, [cards, selectedTab, selectedPlatform]);
  */

  /*
  const availableTags = useMemo(() => {
    const tags = new Set<string>();

    cardsForTagFilter.forEach((card) => {
      card.tags.forEach((tag) => tags.add(tag));
    });

    return Array.from(tags).sort((a, b) =>
      getTagLabel(a).localeCompare(getTagLabel(b), "ru")
    );
  }, [cardsForTagFilter]);
  */

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = cards.filter((card) => {
      const matchesTab =
        selectedTab === "all" || card.contentType === selectedTab;

      const platformOk = cardMatchesPlatform(card, selectedPlatform);

      const text = [
        card.title,
        card.contentType,
        card.rating,
        card.tags.join(" "),
        card.items.map((item) => item.title).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || text.includes(query);

      return matchesTab && platformOk && matchesSearch;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "title_asc") {
        return a.title.localeCompare(b.title, "ru");
      }

      if (sortBy === "title_desc") {
        return b.title.localeCompare(a.title, "ru");
      }

      if (sortBy === "date_asc") {
        return getCardMaxDate(a) - getCardMaxDate(b);
      }

      return getCardMaxDate(b) - getCardMaxDate(a);
    });
  }, [cards, search, selectedTab, selectedPlatform, sortBy]);

  const contentStats = useMemo(() => {
    return {
      movies: cards.filter((card) => card.contentType === "movie").length,
      series: cards.filter((card) => card.contentType === "series").length,
      games: cards.filter((card) => card.contentType === "game").length,
      anime: cards.filter((card) => card.contentType === "anime").length,
    };
  }, [cards]);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <StatPill
          value={contentStats.movies}
          label="фильмов"
          icon="/icons/movie.svg"
          style={{
            borderColor: "rgba(168, 85, 247, 0.42)",
            background:
              "linear-gradient(135deg, rgba(88, 28, 135, 0.30), rgba(24, 24, 27, 0.70))",
          }}
        />

        <StatPill
          value={contentStats.series}
          label="сериалов"
          icon="/icons/series.svg"
          style={{
            borderColor: "rgba(37, 99, 235, 0.42)",
            background:
              "linear-gradient(135deg, rgba(30, 64, 175, 0.26), rgba(24, 24, 27, 0.70))",
          }}
        />

        <StatPill
          value={contentStats.games}
          label="игр"
          icon="/icons/game.svg"
          style={{
            borderColor: "rgba(21, 128, 61, 0.42)",
            background:
              "linear-gradient(135deg, rgba(20, 83, 45, 0.30), rgba(24, 24, 27, 0.70))",
          }}
        />

        <StatPill
          value={contentStats.anime}
          label="аниме"
          icon="/icons/anime.svg"
          style={{
            borderColor: "rgba(236, 72, 153, 0.42)",
            background:
              "linear-gradient(135deg, rgba(157, 23, 77, 0.30), rgba(24, 24, 27, 0.70))",
          }}
        />
      </div>
      
      <div className="mt-8 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setSelectedTab(tab.value);
              // setSelectedTag("all");
              setOpenCardId(null);
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
        placeholder="Введите название контента..."
        className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-zinc-400"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={selectedPlatform}
          onChange={(event) => {
            setSelectedPlatform(event.target.value);
            // setSelectedTag("all");
            setOpenCardId(null);
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        >
          <option value="all">Все площадки</option>
          <option value="youtube">YouTube</option>
          <option value="telegram">Telegram</option>
          <option value="boosty">Boosty</option>
        </select>

        {/*
        <select
          value={selectedTag}
          onChange={(event) => {
            setSelectedTag(event.target.value);
            setOpenCardId(null);
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        >
          <option value="all">Все теги</option>

          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {getTagLabel(tag)}
            </option>
          ))}
        </select>
          */}

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 text-sm text-zinc-500">
        Найдено: {filteredCards.length}
      </div>

      <div className="mt-6 grid items-start gap-5 md:grid-cols-2">
        {filteredCards.map((card) => {
          const visibleItems = getFilteredCardItems(card, selectedPlatform);
          const visibleCard = {
            ...card,
            items: visibleItems,
          };

          const isOpen = openCardId === card.cardId;

          const sources = Array.from(
            new Set(visibleItems.map((item) => getItemSource(item)))
          );

          const singleItem =
            visibleItems.length === 1 ? visibleItems[0] : null;
            
            const duplicates = card.tags.filter(
                (tag, index) => card.tags.indexOf(tag) !== index
            );

            if (duplicates.length > 0) {
                console.log("DUPLICATES:", card.title);
                console.log("TAGS:", card.tags);
            }

          return (
            <div
                key={card.cardId}
                style={{ minHeight: 275 }}
                className={`flex flex-col overflow-hidden rounded-3xl border transition ${
                    isOpen
                        ? "border-zinc-500 bg-zinc-900"
                        : `border-zinc-800 bg-zinc-900/80 hover:border-zinc-600 ${
                            singleItem ? "hover:border-sky-700/80" : ""
                            }`
                }`}
            >
                <button
                    type="button"
                    onClick={() => {
                        if (singleItem) {
                            window.open(getItemUrl(singleItem), "_blank");
                            return;
                        }

                        setOpenCardId(isOpen ? null : card.cardId);
                    }}
                    className="grid w-full shrink-0 overflow-hidden p-6 text-left"
                    style={{ minHeight: 275, gridTemplateRows: "auto 1fr auto" }}
                >
                    <div>
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <span
                                        style={typeColors[card.contentType] ?? typeColors.unknown}
                                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                                    >
                                        {typeLabels[card.contentType] ?? card.contentType}
                                    </span>

                                    {getCardLatestDate(card) && (
                                        <span className="font-medium text-zinc-400">
                                            Обновлено {formatDate(getCardLatestDate(card))}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2">
                                    <h2 className="text-2xl font-bold leading-tight">
                                        {card.title}
                                    </h2>
                                </div>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-2">
                                {card.rating && (
                                    <div className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-950">
                                        Оценка: {card.rating}/10
                                    </div>
                                )}
                            </div>
                        </div>

                        {card.tags.length > 0 && (
                            <div className="mt-4 flex h-[28px] flex-wrap gap-2 overflow-hidden">
                                {card.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                                    >
                                        {getTagLabel(tag)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div />

                        <div>
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex h-[34px] flex-wrap gap-2 overflow-hidden text-sm">
                                    {sources.map((source) => (
                                        <span
                                            key={source}
                                            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-1 text-zinc-300"
                                        >
                                            <SourceIcon source={source} />
                                            <span>{sourceLabels[source] ?? source}</span>
                                        </span>
                                    ))}
                                </div>

                                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-300">
                                    {singleItem ? (
                                        <ExternalLinkIcon />
                                    ) : (
                                        <ChevronIcon isOpen={isOpen} />
                                    )}
                                </div>
                            </div>
                        </div>
                </button>

              {isOpen && !singleItem && (
                <section>
                    <div className="p-6 pt-0">
                        <CardMaterials card={visibleCard} />
                    </div>
                </section>
              )}
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
          Ничего не найдено. Возможно, это ещё не смотрели.
        </div>
      )}
    </>
  );
}