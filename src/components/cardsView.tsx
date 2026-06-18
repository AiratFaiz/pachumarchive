"use client";

import { useMemo, useState } from "react";
import type { ContentCard } from "@/lib/contentCards";
import { getTagLabel } from "@/lib/tagLabels";
import {
  contentTypeColors,
  contentTypeLabels,
  contentTypeTabs,
  sortOptions,
  sourceLabels,
  sourceOrder,
} from "@/lib/contentMeta";
import {
  cardMatchesPlatform,
  formatDate,
  formatRating,
  getCardLatestDate,
  getCardMaxDate,
  getFilteredCardItems,
  getItemSource,
  getItemUrl,
} from "@/lib/contentCardView";
import { CardMaterials } from "@/components/cards/CardMaterials";
import {
  ChevronIcon,
  ExternalLinkIcon,
  SourceIcon,
} from "@/components/cards/CardIcons";
import { StatPill } from "@/components/cards/StatPill";

type Props = {
  cards: ContentCard[];
};

type SearchMatchStrength = "strong" | "weak";

type SearchResult = {
  card: ContentCard;
  matchStrength: SearchMatchStrength;
  matchedItems: ContentCard["items"];
};

function normalizeSearchText(value: string): string {
  return value.toLowerCase();
}

function getSearchParts(value: string): string[] {
  return normalizeSearchText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function textMatches(query: string, values: string[]): boolean {
  const queryTokens = getSearchParts(query);

  return values.some((value) => {
    const normalizedValue = normalizeSearchText(value);
    const valueParts = getSearchParts(value);

    return (
      normalizedValue.includes(query) ||
      queryTokens.every((token) =>
        valueParts.some((part) => part.startsWith(token))
      )
    );
  });
}

function technicalFieldMatches(query: string, values: string[]): boolean {
  const queryTokens = getSearchParts(query);

  return values.some((value) => {
    const valueParts = getSearchParts(value);

    return queryTokens.every((token) =>
      valueParts.some((part) => part.startsWith(token))
    );
  });
}

function getCardSearchStrength(
  card: ContentCard,
  query: string,
  selectedPlatform: string
): SearchResult | null {
  const platformItems = getFilteredCardItems(card, selectedPlatform);

  if (platformItems.length === 0) {
    return null;
  }

  if (!query) {
    return {
      card,
      matchStrength: "strong",
      matchedItems: platformItems,
    };
  }

  const strongMatch =
    textMatches(query, [
      card.title,
      contentTypeLabels[card.contentType] ?? "",
      ...card.tags.map((tag) => getTagLabel(tag)),
    ]) || technicalFieldMatches(query, [card.contentType, ...card.tags]);

  if (strongMatch) {
    return {
      card,
      matchStrength: "strong",
      matchedItems: platformItems,
    };
  }

  const matchedItems = platformItems.filter((item) =>
    textMatches(query, [
      item.title,
      contentTypeLabels[item.contentType] ?? "",
      ...item.tags.map((tag) => getTagLabel(tag)),
    ]) || technicalFieldMatches(query, [item.contentType, ...item.tags])
  );

  if (matchedItems.length === 0) {
    return null;
  }

  return {
    card,
    matchStrength: "weak",
    matchedItems,
  };
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

    const result = cards.reduce<SearchResult[]>((acc, card) => {
      const matchesTab =
        selectedTab === "all" || card.contentType === selectedTab;

      if (!matchesTab || !cardMatchesPlatform(card, selectedPlatform)) {
        return acc;
      }

      const searchResult = getCardSearchStrength(card, query, selectedPlatform);

      if (searchResult) {
        acc.push(searchResult);
      }

      return acc;
    }, []);

    const strongMatchedItemIds = new Set(
      result
        .filter((searchResult) => searchResult.matchStrength === "strong")
        .flatMap((searchResult) =>
          searchResult.matchedItems.map((item) => item.contentId)
        )
    );

    const visibleResults = result.flatMap((searchResult) => {
      if (searchResult.matchStrength === "strong") {
        return [searchResult];
      }

      const matchedItems = searchResult.matchedItems.filter(
        (item) => !strongMatchedItemIds.has(item.contentId)
      );

      if (matchedItems.length === 0) {
        return [];
      }

      return [
        {
          ...searchResult,
          matchedItems,
        },
      ];
    });

    return [...visibleResults].sort((a, b) => {
      if (sortBy === "title_asc") {
        return a.card.title.localeCompare(b.card.title, "ru");
      }

      if (sortBy === "title_desc") {
        return b.card.title.localeCompare(a.card.title, "ru");
      }

      if (sortBy === "date_asc") {
        return getCardMaxDate(a.card) - getCardMaxDate(b.card);
      }

      return getCardMaxDate(b.card) - getCardMaxDate(a.card);
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
            borderColor: "rgba(29, 78, 216, 0.42)",
            background:
              "linear-gradient(135deg, rgba(29, 78, 216, 0.22), rgba(24, 24, 27, 0.70))",
          }}
        />

        <StatPill
          value={contentStats.series}
          label="сериалов"
          icon="/icons/series.svg"
          style={{
            borderColor: "rgba(124, 58, 237, 0.42)",
            background:
              "linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(24, 24, 27, 0.70))",
          }}
        />

        <StatPill
          value={contentStats.games}
          label="игр"
          icon="/icons/game.svg"
          style={{
            borderColor: "rgba(21, 128, 61, 0.42)",
            background:
              "linear-gradient(135deg, rgba(21, 128, 61, 0.22), rgba(24, 24, 27, 0.70))",
          }}
        />

        <StatPill
          value={contentStats.anime}
          label="аниме"
          icon="/icons/anime.svg"
          style={{
            borderColor: "rgba(219, 39, 119, 0.42)",
            background:
              "linear-gradient(135deg, rgba(219, 39, 119, 0.22), rgba(24, 24, 27, 0.70))",
          }}
        />
      </div>
      
      <div className="mt-8 flex flex-wrap gap-3">
        {contentTypeTabs.map((tab) => (
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
        {filteredCards.map(({ card, matchStrength, matchedItems }) => {
          const visibleItems = matchedItems;
          const itemRatings = visibleItems
            .map((item) => item.rating)
            .filter(Boolean);
          const uniqueItemRatings = Array.from(new Set(itemRatings));
          const hasUniformItemRating =
            visibleItems.length > 0 &&
            itemRatings.length === visibleItems.length &&
            uniqueItemRatings.length === 1;
          const shouldCollapseItemRatings =
            Boolean(card.rating) ||
            (!card.rating &&
              itemRatings.length > 0 &&
              (itemRatings.length === 1 || hasUniformItemRating));
          const ratingBadge = card.rating
            ? formatRating(card.rating)
            : itemRatings.length === 1 || hasUniformItemRating
              ? formatRating(uniqueItemRatings[0])
              : itemRatings.length > 0
                ? `Оценки: ${itemRatings.length}`
                : "";
          const visibleCard = {
            ...card,
            items: shouldCollapseItemRatings
              ? visibleItems.map((item) => ({
                  ...item,
                  rating: "",
                }))
              : visibleItems,
          };

          const isOpen = openCardId === card.cardId;
          const isWeakMatch = matchStrength === "weak";

          const sources = Array.from(
            new Set(visibleItems.map((item) => getItemSource(item)))
          ).sort((a, b) => sourceOrder.indexOf(a) - sourceOrder.indexOf(b));

          const singleItem =
            !isWeakMatch && visibleItems.length === 1 ? visibleItems[0] : null;

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
                                        style={contentTypeColors[card.contentType] ?? contentTypeColors.unknown}
                                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                                    >
                                        {contentTypeLabels[card.contentType] ?? card.contentType}
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

                                     {isWeakMatch && (
                                         <div className="mt-2 text-sm text-zinc-500">
                                             Найдено внутри: {visibleItems.length} из {card.items.length}
                                         </div>
                                     )}
                                 </div>
                             </div>

                             {ratingBadge && (
                                 <div className="flex shrink-0 flex-col items-end gap-2">
                                     <div className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-950">
                                         {ratingBadge}
                                     </div>
                                 </div>
                             )}
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
                                    title={sourceLabels[source] ?? source}
                                    className="flex items-center justify-center"
                                  >
                                    <SourceIcon source={source} />
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
