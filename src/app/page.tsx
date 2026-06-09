import { ContentSearch } from "@/components/ContentSearch";
import { getContentItems } from "@/lib/googleSheet";

export default async function Home() {
  const items = await getContentItems();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-bold">Каталог просмотренного Русланом Пачукой</h1>

        <p className="mt-3 text-zinc-400">
          Быстрая проверка: смотрели ли уже фильм, мультфильм или другой контент.
        </p>

        <ContentSearch items={items} />
      </div>
    </main>
  );
}