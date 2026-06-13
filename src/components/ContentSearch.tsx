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

export function ContentSearch({ items }: Props) {
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesTab =
        selectedTab === "all" || item.contentType === selectedTab;

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

      return matchesTab && matchesSearch;
    });
  }, [items, search, selectedTab]);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSelectedTab(tab.value)}
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
                  {item.firstDate && <span>• {item.firstDate}</span>}
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
                    {tag}
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