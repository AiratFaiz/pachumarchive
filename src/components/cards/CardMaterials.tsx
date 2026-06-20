"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentCard } from "@/lib/contentCards";
import { sourceLabels } from "@/lib/contentMeta";
import { groupBySource } from "@/lib/contentCardView";
import { ExpandIcon, SourceIcon } from "@/components/cards/CardIcons";
import { SourceLink } from "@/components/cards/SourceLink";

export function CardMaterials({ card }: { card: ContentCard }) {
  const [openSource, setOpenSource] = useState<string | null>(null);
  const sourceRefs = useRef(new Map<string, HTMLDivElement>());
  const pendingSourceAnchor = useRef<{ source: string; top: number } | null>(null);

  const grouped = groupBySource(card.items);
  const sourceEntries = Object.entries(grouped);

  const shouldGroupBySource =
    sourceEntries.length > 1 &&
    sourceEntries.some(([, items]) => items.length > 1);

  useEffect(() => {
    if (!openSource || pendingSourceAnchor.current?.source !== openSource) return;

    const frame = requestAnimationFrame(() => {
      const anchor = pendingSourceAnchor.current;
      const element = sourceRefs.current.get(openSource);

      if (anchor && element) {
        window.scrollBy({
          top: element.getBoundingClientRect().top - anchor.top,
          behavior: "auto",
        });
      }

      pendingSourceAnchor.current = null;
    });

    return () => cancelAnimationFrame(frame);
  }, [openSource]);

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
            ref={(element) => {
              if (element) {
                sourceRefs.current.set(source, element);
              } else {
                sourceRefs.current.delete(source);
              }
            }}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/40"
          >
            <button
              type="button"
              onClick={() => {
                const element = sourceRefs.current.get(source);
                pendingSourceAnchor.current =
                  !isOpen && element
                    ? {
                        source,
                        top: element.getBoundingClientRect().top,
                      }
                    : null;
                setOpenSource(isOpen ? null : source);
              }}
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
