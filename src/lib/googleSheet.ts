import Papa from "papaparse";

export type ContentItem = {
  id: string;
  title: string;
  contentType: string;
  rating: string;

  firstDate: string;

  tags: string[];

  youtubeUrl: string;
  telegramUrl: string;
  boostyUrl: string;
};

const CONTENT_CSV_URL = "/data/content_items.csv";

async function fetchCsvRows(url: string): Promise<Record<string, string>[]> {
  const response = await fetch(url, {
    next: { revalidate: 60 },
  });

  const csvText = await response.text();

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data;
}

function parseTags(tags: string | undefined): string[] {
  if (!tags) return [];

  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function getContentItems(): Promise<ContentItem[]> {
  const rows = await fetchCsvRows(CONTENT_CSV_URL);

return rows
  .filter((row) => row.content_id && row.canonical_title)
  .map((row) => ({
    id: row.content_id ?? "",

    title: row.canonical_title ?? "",

    contentType: row.content_type ?? "",

    rating: row.rating ?? "",

    firstDate: row.first_date ?? "",

    tags: parseTags(row.content_tags),

    youtubeUrl: row.youtube_url ?? "",

    telegramUrl: row.telegram_url ?? "",

    boostyUrl: row.boosty_url ?? "",
  }));
}