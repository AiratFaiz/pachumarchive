import fs from "fs/promises";
import path from "path";
import Papa from "papaparse";

export type ContentSourceItem = {
  contentId: string;
  title: string;
  contentType: string;
  tags: string[];
  rating: string;
  ratingSource: string;
  firstDate: string;
  lastDate: string;
  durationHours: string;
  sortOrder: number;
  youtubeUrl: string;
  telegramUrl: string;
  boostyUrl: string;
};

export type ContentCard = {
  cardId: string;
  title: string;
  contentType: string;
  tags: string[];
  creatorTags?: string[];
  rating: string;
  ratingSource: string;
  items: ContentSourceItem[];
};

const DATA_DIR = path.join(process.cwd(), "public", "data");

const CONTENT_ITEMS_PATH = path.join(DATA_DIR, "content_items.csv");
const CONTENT_CARDS_PATH = path.join(DATA_DIR, "content_cards.csv");
const CONTENT_CARD_ITEMS_PATH = path.join(DATA_DIR, "content_card_items.csv");
const CREATOR_CARDS_PATH = path.join(DATA_DIR, "creator_cards.csv");
const CREATOR_CARD_ITEMS_PATH = path.join(DATA_DIR, "creator_card_items.csv");
const VISIBLE_UNKNOWN_TAG = "gustav";

async function readCsv(pathToFile: string): Promise<Record<string, string>[]> {
  const csvText = await fs.readFile(pathToFile, "utf-8");

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data;
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getSortOrder(value: string | undefined): number {
  const num = Number(value);
  return Number.isNaN(num) ? 9999 : num;
}

function getDateTime(value: string | undefined): number {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function getCardMaxDate(card: ContentCard): number {
  return Math.max(
    ...card.items.map((item) => getDateTime(item.lastDate || item.firstDate)),
    0
  );
}

function isVisibleCard(card: ContentCard): boolean {
  if (card.contentType !== "unknown") return true;

  return card.tags.includes(VISIBLE_UNKNOWN_TAG);
}

function sortItemsInsideCard(items: ContentSourceItem[]): ContentSourceItem[] {
  return [...items].sort((a, b) => {
    const sortOrderDiff = a.sortOrder - b.sortOrder;

    if (sortOrderDiff !== 0) {
      return sortOrderDiff;
    }

    return (
      getDateTime(a.firstDate || a.lastDate) -
      getDateTime(b.firstDate || b.lastDate)
    );
  });
}

function buildItemsById(rows: Record<string, string>[]): Map<string, ContentSourceItem> {
  const itemsById = new Map<string, ContentSourceItem>();

  rows.forEach((row) => {
    if (!row.content_id) return;

    itemsById.set(row.content_id, {
      contentId: row.content_id,
      title: row.canonical_title ?? "",
      contentType: row.content_type ?? "",
      tags: parseTags(row.content_tags),
      rating: row.rating ?? "",
      ratingSource: row.rating_source ?? "",
      firstDate: row.first_date ?? "",
      lastDate: row.last_date ?? "",
      durationHours: row.duration_hours ?? "",
      sortOrder: 9999,
      youtubeUrl: row.youtube_url ?? "",
      telegramUrl: row.telegram_url ?? "",
      boostyUrl: row.boosty_url ?? "",
    });
  });

  return itemsById;
}

function buildLinksByCardId(
  rows: Record<string, string>[],
  cardIdField: string
): Map<string, Record<string, string>[]> {
  const linksByCardId = new Map<string, Record<string, string>[]>();

  rows.forEach((link) => {
    const cardId = link[cardIdField];

    if (!cardId) return;

    const links = linksByCardId.get(cardId) ?? [];
    links.push(link);
    linksByCardId.set(cardId, links);
  });

  return linksByCardId;
}

export async function getContentCards(): Promise<ContentCard[]> {
  const [itemsRows, cardsRows, linksRows] = await Promise.all([
    readCsv(CONTENT_ITEMS_PATH),
    readCsv(CONTENT_CARDS_PATH),
    readCsv(CONTENT_CARD_ITEMS_PATH),
  ]);

  const itemsById = buildItemsById(itemsRows);
  const linksByCardId = buildLinksByCardId(linksRows, "card_id");

  const linkedContentIds = new Set<string>();

  const realCards: ContentCard[] = cardsRows
    .filter((card) => card.card_id && card.card_title)
    .filter((card) => card.is_active !== "0")
    .map((card) => {
      const cardLinks = (linksByCardId.get(card.card_id) ?? []).sort(
        (a, b) => getSortOrder(a.sort_order) - getSortOrder(b.sort_order)
      );

      const linkedItems = cardLinks
        .map((link) => {
          const item = itemsById.get(link.content_id);

          if (!item) return null;

          linkedContentIds.add(link.content_id);

          return {
            ...item,
            sortOrder: getSortOrder(link.sort_order),
          };
        })
        .filter(Boolean) as ContentSourceItem[];

      return {
        cardId: card.card_id,
        title: card.card_title,
        contentType: card.content_type ?? "",
        tags: parseTags(card.content_tags),
        rating: card.rating ?? "",
        ratingSource: card.rating_source ?? "",
        items: sortItemsInsideCard(linkedItems),
      };
    })
    .filter((card) => card.items.length > 0);

  const singleItemCards: ContentCard[] = Array.from(itemsById.values())
    .filter((item) => !linkedContentIds.has(item.contentId))
    .map((item) => ({
      cardId: `item-${item.contentId}`,
      title: item.title,
      contentType: item.contentType,
      tags: item.tags,
      rating: item.rating,
      ratingSource: "",
      items: sortItemsInsideCard([item]),
    }));

  return [...realCards, ...singleItemCards].filter(isVisibleCard).sort(
    (a, b) => getCardMaxDate(b) - getCardMaxDate(a)
  );
}

export async function getCreatorCards(): Promise<ContentCard[]> {
  const [itemsRows, cardsRows, linksRows] = await Promise.all([
    readCsv(CONTENT_ITEMS_PATH),
    readCsv(CREATOR_CARDS_PATH),
    readCsv(CREATOR_CARD_ITEMS_PATH),
  ]);

  const itemsById = buildItemsById(itemsRows);
  const linksByCardId = buildLinksByCardId(linksRows, "creator_card_id");

  return cardsRows
    .filter((card) => card.creator_card_id && card.card_title)
    .filter((card) => card.is_active !== "0")
    .map((card) => {
      const linkedItems = (linksByCardId.get(card.creator_card_id) ?? [])
        .map((link) => {
          const item = itemsById.get(link.content_id);

          if (!item) return null;

          return {
            ...item,
            sortOrder: getSortOrder(link.sort_order),
          };
        })
        .filter(Boolean) as ContentSourceItem[];

      const creatorTags = parseTags(card.creator_tags);
      const contentTags = parseTags(card.content_tags);

      return {
        cardId: `creator-${card.creator_card_id}`,
        title: card.card_title,
        contentType: card.content_type ?? "",
        tags: [...creatorTags, ...contentTags],
        creatorTags,
        rating: "",
        ratingSource: "",
        items: sortItemsInsideCard(linkedItems),
      };
    })
    .filter((card) => card.items.length > 0)
    .sort((a, b) => getCardMaxDate(b) - getCardMaxDate(a));
}
