import type { ContentCard, ContentSourceItem } from "@/lib/contentCards";

export function getItemSource(item: ContentSourceItem): string {
  if (item.boostyUrl) return "boosty";
  if (item.telegramUrl) return "telegram";
  if (item.youtubeUrl) return "youtube";
  return "other";
}

export function getItemUrl(item: ContentSourceItem): string {
  return item.boostyUrl || item.telegramUrl || item.youtubeUrl || "#";
}

export function getCardMaxDate(card: ContentCard): number {
  return Math.max(
    ...card.items.map((item) => {
      const value = item.lastDate || item.firstDate;
      const time = new Date(value).getTime();

      return Number.isNaN(time) ? 0 : time;
    }),
    0
  );
}

export function cardMatchesPlatform(
  card: ContentCard,
  platform: string
): boolean {
  if (platform === "all") return true;

  return card.items.some((item) => getItemSource(item) === platform);
}

export function getFilteredCardItems(
  card: ContentCard,
  platform: string
): ContentSourceItem[] {
  if (platform === "all") return card.items;

  return card.items.filter((item) => getItemSource(item) === platform);
}

export function groupBySource(items: ContentSourceItem[]) {
  return items.reduce<Record<string, ContentSourceItem[]>>((acc, item) => {
    const source = getItemSource(item);
    if (!acc[source]) acc[source] = [];
    acc[source].push(item);
    return acc;
  }, {});
}

export function formatDuration(hours: string): string {
  if (!hours) return "";

  const num = Number(hours);

  if (Number.isNaN(num)) return hours;
  if (num < 1) return `${Math.round(num * 60)} мин`;

  return `${num.toFixed(1)} ч`;
}

export function formatRating(rating: string): string {
  if (rating === "-") return "Без оценки";

  return `Оценка: ${rating}/10`;
}

export function hasValidDuration(hours: string): boolean {
  const num = Number(hours);

  return !Number.isNaN(num) && num > 0;
}

export function formatDate(value: string): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("ru-RU");
}

export function getCardLatestDate(card: ContentCard): string {
  const dates = card.items
    .map((item) => item.lastDate || item.firstDate)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return dates[0] ?? "";
}
