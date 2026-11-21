import PodcastCard from "@/components/PodcastCard";
import { getPodcasts } from "@/lib/googleSheets";
import { dateValue } from "@/lib/utils";

export const metadata = { title: "Podcast Hikmah" };
export const revalidate = 600;

export default async function Page() {
  const list = (await getPodcasts()).sort((a, b) => dateValue(b.date_added) - dateValue(a.date_added));
  return (
    <div>
      <header className="mb-6">
        <p dir="rtl" className="font-arabic text-2xl text-accent">بودكاست الحكمة</p>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Playlist Podcast Hikmah (YouTube)</h1>
        <p className="mt-1 text-sm text-muted">{list.length} episod · {list.filter((p) => p.pdf_url).length} dengan transkrip PDF</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => <PodcastCard key={p.podcast_id} p={p} />)}
        {list.length === 0 && <p className="card col-span-full p-10 text-center text-muted">Belum ada podcast.</p>}
      </div>
    </div>
  );
}
