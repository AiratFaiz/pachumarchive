"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentCard } from "@/lib/contentCards";
import { getTagLabel, isVisibleContentTag } from "@/lib/tagLabels";
import {
  battleRapEventsByPlatform,
  battleRapPlatformFilters,
  contentTypeColors,
  contentTypeLabels,
  contentTypeTabs,
  isRatedContentType,
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
  creatorCards: ContentCard[];
};

type SearchMatchStrength = "strong" | "weak";

type SearchResult = {
  card: ContentCard;
  matchStrength: SearchMatchStrength;
  matchedItems: ContentCard["items"];
};

type BattleRapFilter = {
  platform: string;
  event: string;
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

function parseNumericRating(rating: string): number | null {
  if (!rating || rating === "-") return null;

  const value = Number(rating.replace(",", "."));

  return Number.isFinite(value) ? value : null;
}

function getSortableRating(searchResult: SearchResult): number | null {
  const { card, matchedItems } = searchResult;

  if (!isRatedContentType(card.contentType)) return null;

  const cardRating = parseNumericRating(card.rating);

  if (cardRating !== null) return cardRating;

  const itemRatings = matchedItems
    .filter((item) => isRatedContentType(item.contentType))
    .map((item) => parseNumericRating(item.rating))
    .filter((rating): rating is number => rating !== null);

  const uniqueRatings = Array.from(new Set(itemRatings));

  if (uniqueRatings.length === 1) return uniqueRatings[0];

  return null;
}

function tagsMatchBattleRapFilter(
  tags: string[],
  battleRapFilter: BattleRapFilter
): boolean {
  if (
    battleRapFilter.platform !== "all" &&
    !tags.includes(battleRapFilter.platform)
  ) {
    return false;
  }

  if (battleRapFilter.event !== "all" && !tags.includes(battleRapFilter.event)) {
    return false;
  }

  return true;
}

function itemMatchesBattleRapFilter(
  card: ContentCard,
  item: ContentCard["items"][number],
  battleRapFilter: BattleRapFilter
): boolean {
  return tagsMatchBattleRapFilter(
    Array.from(new Set([...card.tags, ...item.tags])),
    battleRapFilter
  );
}

function cardMatchesBattleRapFilter(
  card: ContentCard,
  battleRapFilter: BattleRapFilter
): boolean {
  if (battleRapFilter.platform === "all" && battleRapFilter.event === "all") {
    return true;
  }

  if (tagsMatchBattleRapFilter(card.tags, battleRapFilter)) {
    return true;
  }

  return card.items.some((item) =>
    itemMatchesBattleRapFilter(card, item, battleRapFilter)
  );
}

function getBattleRapFilteredItems(
  card: ContentCard,
  items: ContentCard["items"],
  battleRapFilter: BattleRapFilter
): ContentCard["items"] {
  if (battleRapFilter.platform === "all" && battleRapFilter.event === "all") {
    return items;
  }

  return items.filter((item) =>
    itemMatchesBattleRapFilter(card, item, battleRapFilter)
  );
}

function getCardSearchStrength(
  card: ContentCard,
  query: string,
  selectedPlatform: string,
  battleRapFilter: BattleRapFilter
): SearchResult | null {
  const platformItems = getBattleRapFilteredItems(
    card,
    getFilteredCardItems(card, selectedPlatform),
    battleRapFilter
  );

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

export function CardsView({ cards, creatorCards }: Props) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedBattleRapPlatform, setSelectedBattleRapPlatform] =
    useState("all");
  const [selectedBattleRapEvent, setSelectedBattleRapEvent] = useState("all");
  const [selectedCreatorTag, setSelectedCreatorTag] = useState("all");
  // const [selectedTag, setSelectedTag] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const pendingCardAnchor = useRef<{ cardId: string; top: number } | null>(null);

  const activeBattleRapFilter = useMemo<BattleRapFilter>(() => {
    if (selectedTab !== "battle_rap") {
      return { platform: "all", event: "all" };
    }

    return {
      platform: selectedBattleRapPlatform,
      event: selectedBattleRapEvent,
    };
  }, [selectedBattleRapEvent, selectedBattleRapPlatform, selectedTab]);

  const battleRapEventOptions =
    battleRapEventsByPlatform[selectedBattleRapPlatform] ?? [];

  const creatorTagOptions = useMemo(() => {
    const tags = new Set<string>();

    creatorCards.forEach((card) => {
      card.creatorTags?.forEach((tag) => tags.add(tag));
    });

    return Array.from(tags).sort((a, b) =>
      getTagLabel(a).localeCompare(getTagLabel(b), "ru")
    );
  }, [creatorCards]);

  useEffect(() => {
    if (!openCardId || pendingCardAnchor.current?.cardId !== openCardId) return;

    const frame = requestAnimationFrame(() => {
      const anchor = pendingCardAnchor.current;
      const element = cardRefs.current.get(openCardId);

      if (anchor && element) {
        window.scrollBy({
          top: element.getBoundingClientRect().top - anchor.top,
          behavior: "auto",
        });
      }

      pendingCardAnchor.current = null;
    });

    return () => cancelAnimationFrame(frame);
  }, [openCardId]);

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
    const activeCards = selectedTab === "creator_content" ? creatorCards : cards;

    const result = activeCards.reduce<SearchResult[]>((acc, card) => {
      const matchesTab =
        selectedTab === "creator_content"
          ? selectedCreatorTag === "all" ||
            card.creatorTags?.includes(selectedCreatorTag)
          : selectedTab === "all" || card.contentType === selectedTab;

      if (
        !matchesTab ||
        !cardMatchesPlatform(card, selectedPlatform) ||
        !cardMatchesBattleRapFilter(card, activeBattleRapFilter)
      ) {
        return acc;
      }

      const searchResult = getCardSearchStrength(
        card,
        query,
        selectedPlatform,
        activeBattleRapFilter
      );

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

      if (sortBy === "rating_asc" || sortBy === "rating_desc") {
        const ratingA = getSortableRating(a);
        const ratingB = getSortableRating(b);

        if (ratingA !== null && ratingB === null) return -1;
        if (ratingA === null && ratingB !== null) return 1;

        if (ratingA !== null && ratingB !== null && ratingA !== ratingB) {
          return sortBy === "rating_asc"
            ? ratingA - ratingB
            : ratingB - ratingA;
        }

        return getCardMaxDate(b.card) - getCardMaxDate(a.card);
      }

      return getCardMaxDate(b.card) - getCardMaxDate(a.card);
    });
  }, [
    cards,
    creatorCards,
    search,
    selectedTab,
    selectedPlatform,
    activeBattleRapFilter,
    selectedCreatorTag,
    sortBy,
  ]);

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
              if (tab.value !== "battle_rap") {
                setSelectedBattleRapPlatform("all");
                setSelectedBattleRapEvent("all");
              }
              if (tab.value !== "creator_content") {
                setSelectedCreatorTag("all");
              }
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
          <option value="all">Все источники</option>
          <option value="youtube">YouTube</option>
          <option value="telegram">Telegram</option>
          <option value="boosty">Boosty</option>
        </select>

        {selectedTab === "battle_rap" && (
          <>
            <select
              value={selectedBattleRapPlatform}
              onChange={(event) => {
                setSelectedBattleRapPlatform(event.target.value);
                setSelectedBattleRapEvent("all");
                setOpenCardId(null);
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            >
              <option value="all">Все баттл-площадки</option>

              {battleRapPlatformFilters.map((platform) => (
                <option key={platform.value} value={platform.value}>
                  {platform.label}
                </option>
              ))}
            </select>

            {battleRapEventOptions.length > 0 && (
              <select
                value={selectedBattleRapEvent}
                onChange={(event) => {
                  setSelectedBattleRapEvent(event.target.value);
                  setOpenCardId(null);
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              >
                <option value="all">Все ивенты</option>

                {battleRapEventOptions.map((eventOption) => (
                  <option key={eventOption.value} value={eventOption.value}>
                    {eventOption.label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        {selectedTab === "creator_content" && (
          <select
            value={selectedCreatorTag}
            onChange={(event) => {
              setSelectedCreatorTag(event.target.value);
              setOpenCardId(null);
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
          >
            <option value="all">Все разделы</option>

            {creatorTagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {getTagLabel(tag)}
              </option>
            ))}
          </select>
        )}

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

      {selectedTab === "creator_content" ? (
        <div className="mt-4 max-w-4xl text-sm leading-6 text-zinc-400">
          В разделе собраны реакции на собственные баттлы, заявки, судейство,
          творческие стримы, игротурниры и другие материалы, связанные
          непосредственно с Пачукой.
        </div>
      ) : (
        <div className="mt-4 text-sm text-zinc-500">
          Найдено: {filteredCards.length}
        </div>
      )}

      <div className="mt-6 grid items-start gap-5 md:grid-cols-2">
        {filteredCards.map(({ card, matchStrength, matchedItems }) => {
          const visibleItems = matchedItems;
          const showCardRating = isRatedContentType(card.contentType);
          const ratedVisibleItems = visibleItems.filter((item) =>
            isRatedContentType(item.contentType)
          );
          const itemRatings = ratedVisibleItems
            .map((item) => item.rating)
            .filter(Boolean);
          const uniqueItemRatings = Array.from(new Set(itemRatings));
          const hasUniformItemRating =
            ratedVisibleItems.length > 0 &&
            itemRatings.length === ratedVisibleItems.length &&
            uniqueItemRatings.length === 1;
          const shouldCollapseItemRatings =
            showCardRating &&
            (Boolean(card.rating) ||
              (!card.rating &&
                itemRatings.length > 0 &&
                (itemRatings.length === 1 || hasUniformItemRating)));
          const ratingBadge = showCardRating && card.rating
            ? formatRating(card.rating)
            : showCardRating
              ? itemRatings.length === 1 || hasUniformItemRating
                ? formatRating(uniqueItemRatings[0])
                : itemRatings.length > 0
                  ? `Оценки: ${itemRatings.length}`
                  : ""
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
          const isBattleRapFiltered =
            selectedTab === "battle_rap" &&
            (activeBattleRapFilter.platform !== "all" ||
              activeBattleRapFilter.event !== "all");
          const displayItem =
            isBattleRapFiltered && visibleItems.length === 1 && card.items.length > 1
              ? visibleItems[0]
              : null;
          const displayTitle = displayItem?.title ?? card.title;
          const displayDate = displayItem
            ? displayItem.lastDate || displayItem.firstDate
            : getCardLatestDate(card);
          const displayTags = (displayItem?.tags ?? card.tags).filter(
            isVisibleContentTag
          );
          const shouldShowMatchedItemsCount =
            !displayItem &&
            (isWeakMatch || isBattleRapFiltered) &&
            visibleItems.length < card.items.length;

          return (
            <div
                key={card.cardId}
                ref={(element) => {
                  if (element) {
                    cardRefs.current.set(card.cardId, element);
                  } else {
                    cardRefs.current.delete(card.cardId);
                  }
                }}
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

                        const element = cardRefs.current.get(card.cardId);
                        pendingCardAnchor.current =
                          !isOpen && element
                            ? {
                                cardId: card.cardId,
                                top: element.getBoundingClientRect().top,
                              }
                            : null;
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

                                    {displayDate && (
                                        <span className="font-medium text-zinc-400">
                                            Обновлено {formatDate(displayDate)}
                                        </span>
                                    )}
                                </div>

                                  <div className="mt-2">
                                      <h2 className="text-2xl font-bold leading-tight">
                                          {displayTitle}
                                      </h2>

                                     {shouldShowMatchedItemsCount && (
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

                        {displayTags.length > 0 && (
                            <div className="mt-4 flex h-[28px] flex-wrap gap-2 overflow-hidden">
                                {displayTags.map((tag) => (
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
