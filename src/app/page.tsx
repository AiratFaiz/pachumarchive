import { getContentCards } from "@/lib/contentCards";
import { CardsView } from "@/components/cardsView";
import { ArchiveNotice } from "@/components/ArchiveNotice";

export default async function HomePage() {
  const cards = await getContentCards();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Архив Пачуки
          </h1>

          <ArchiveNotice />
        </div>

        <p className="mt-4 max-w-3xl text-lg text-zinc-400">
          Архив просмотренного и пройденного контента Пачуки. Фильмы, сериалы,
          аниме, игры, баттлрэп, музыка и многое другое.
        </p>

        <CardsView cards={cards} />
      </div>
    </main>
  );
}