type PageProps = {
  params: {
    id: string;
  };
};

export default function ContentPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <a href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Back to archive
        </a>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Content ID: {params.id}</p>

          <h1 className="mt-4 text-4xl font-bold">Resident Evil 4</h1>

          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm">
              Game
            </span>
            <span className="rounded-full bg-green-900/50 px-3 py-1 text-sm text-green-300">
              Completed
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Streams</p>
              <p className="mt-2 text-2xl font-bold">15</p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Hours</p>
              <p className="mt-2 text-2xl font-bold">42</p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Bought by</p>
              <p className="mt-2 text-2xl font-bold">Chat</p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold">Summary</h2>
            <p className="mt-3 text-zinc-400">
              Прохождение завершено. Здесь позже будет краткое резюме,
              ссылки на VOD, клипы, теги и заметки по контенту.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}