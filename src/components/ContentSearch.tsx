"use client";

import { useMemo, useState } from "react";
import type { ContentItem } from "@/lib/googleSheet";

type Props = {
  items: ContentItem[];
};

export function ContentSearch({ items }: Props) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) => {
      const text = [
        item.title,
        item.type,
        item.rating,
        item.watchDate,
        item.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [items, search]);

  return (
    <>
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Введите название фильма или мультфильма..."
        className="mt-8 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-zinc-400"
      />

      <div className="mt-4 text-sm text-zinc-500">
        Найдено: {filteredItems.length}
      </div>

      <div className="mt-6 space-y-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{item.title}</h2>

                <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-400">
                  {item.type && <span>{item.type}</span>}
                  {item.watchDate && <span>• {item.watchDate}</span>}
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