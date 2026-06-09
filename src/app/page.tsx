import { ContentSearch } from "@/components/ContentSearch";
import { getContentItems } from "@/lib/googleSheet";

export default async function Home() {
  const items = await getContentItems();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-5xl font-bold tracking-tight">Архив Пачуки</h1>

        <p className="mt-4 text-lg text-zinc-400">
          Проверьте, смотрел ли Руслан этот фильм, мультфильм или игру.
        </p>

        <ContentSearch items={items} />
      </div>
    </main>
  );
}