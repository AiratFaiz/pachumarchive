import Papa from "papaparse";

export type ContentItem = {
  id: string;
  title: string;
  type: string;
  rating: string;
  watchDate: string;
  tags: string[];
};

const CONTENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0GC26EJ6Al2nfaGktZypwlGlFdamK8hI-xaZgaonCWtE9BlDCO7YwXWXOv7TcSw9acM38ca9a8O1U/pub?gid=0&single=true&output=csv";

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
    .filter((row) => row.id && row.title)
    .map((row) => ({
      id: row.id ?? "",
      title: row.title ?? "",
      type: row.type ?? "",
      rating: row.rating ?? "",
      watchDate: row.watch_date ?? "",
      tags: parseTags(row.tags),
    }));
}