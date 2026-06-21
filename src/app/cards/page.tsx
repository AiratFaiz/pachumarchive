import { getContentCards, getCreatorCards } from "@/lib/contentCards";
import { CardsView } from "@/components/cardsView";

export default async function CardsPage() {
  const [cards, creatorCards] = await Promise.all([
    getContentCards(),
    getCreatorCards(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-5xl font-bold tracking-tight">
          Карточки контента
        </h1>

        <p className="mt-4 max-w-3xl text-lg text-zinc-400">
          Тестовая версия карточек: один контент объединяет записи с разных площадок.
        </p>

        <CardsView cards={cards} creatorCards={creatorCards} />
      </div>
    </main>
  );
}
