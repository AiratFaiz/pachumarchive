import fs from "fs/promises";
import path from "path";
import Papa from "papaparse";

export type ContentSourceItem = {
  contentId: string;
  title: string;
  contentType: string;
  tags: string[];
  rating: string;
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
  rating: string;
  ratingSource: string;
  items: ContentSourceItem[];
};

const DATA_DIR = path.join(process.cwd(), "public", "data");

const CONTENT_ITEMS_PATH = path.join(DATA_DIR, "content_items.csv");
const CONTENT_CARDS_PATH = path.join(DATA_DIR, "content_cards.csv");
const CONTENT_CARD_ITEMS_PATH = path.join(DATA_DIR, "content_card_items.csv");

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

export async function getContentCards(): Promise<ContentCard[]> {
  const [itemsRows, cardsRows, linksRows] = await Promise.all([
    readCsv(CONTENT_ITEMS_PATH),
    readCsv(CONTENT_CARDS_PATH),
    readCsv(CONTENT_CARD_ITEMS_PATH),
  ]);

  const itemsById = new Map<string, ContentSourceItem>();

  itemsRows.forEach((row) => {
    if (!row.content_id) return;

    itemsById.set(row.content_id, {
      contentId: row.content_id,
      title: row.canonical_title ?? "",
      contentType: row.content_type ?? "",
      tags: parseTags(row.content_tags),
      rating: row.rating ?? "",
      firstDate: row.first_date ?? "",
      lastDate: row.last_date ?? "",
      durationHours: row.duration_hours ?? "",
      sortOrder: 9999,
      youtubeUrl: row.youtube_url ?? "",
      telegramUrl: row.telegram_url ?? "",
      boostyUrl: row.boosty_url ?? "",
    });
  });

  const linkedContentIds = new Set<string>();

  const realCards: ContentCard[] = cardsRows
    .filter((card) => card.card_id && card.card_title)
    .filter((card) => card.is_active !== "0")
    .map((card) => {
      const cardLinks = linksRows
        .filter((link) => link.card_id === card.card_id)
        .sort(
          (a, b) =>
            getSortOrder(a.sort_order) - getSortOrder(b.sort_order)
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

  return [...realCards, ...singleItemCards].sort(
    (a, b) => getCardMaxDate(b) - getCardMaxDate(a)
  );
}