import type { ContentSourceItem } from "@/lib/contentCards";
import { sourceLabels } from "@/lib/contentMeta";
import {
  formatDate,
  formatDuration,
  getItemSource,
  getItemUrl,
  hasValidDuration,
} from "@/lib/contentCardView";
import { ExternalLinkIcon } from "@/components/cards/CardIcons";

export function SourceLink({ item }: { item: ContentSourceItem }) {
  const source = getItemSource(item);
  const url = getItemUrl(item);

  return (
    <a
      href={url}
      target="_blank"
      className="block rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-600"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="min-w-0">
            {sourceLabels[source] ?? source}
            {item.firstDate && (
              <span className="ml-2 text-zinc-600">
                · {formatDate(item.firstDate)}
              </span>
            )}
          </div>

          <div className="mt-1 text-base font-semibold">{item.title}</div>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-sm text-zinc-400">
          {hasValidDuration(item.durationHours) && (
            <span className="whitespace-nowrap">
              {formatDuration(item.durationHours)}
            </span>
          )}
          <div className="flex h-8 w-8 items-center justify-center text-zinc-500">
            <ExternalLinkIcon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </a>
  );
}
