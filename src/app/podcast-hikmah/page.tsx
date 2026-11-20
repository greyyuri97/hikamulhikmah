import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getPodcasts } from "@/lib/googleSheets";
import { dateValue, ytThumb } from "@/lib/utils";

export const metadata = { title: "Podcast Hikmah" };
export const revalidate = 600;

export default async function Page() {
  const list = (await getPodcasts()).sort((a, b) => dateValue(b.date_added) - dateValue(a.date_added));
  return (
    <div>
      <header className="mb-6">
        <p dir="rtl" className="font-arabic text-2xl text-accent">بودكاست الحكمة</p>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Playlist Podcast Hikmah (YouTube)</h1>
        <p className="mt-1 text-sm text-muted">{list.length} episod</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <a key={p.podcast_id} href={`https://www.youtube.com/watch?v=${p.youtube_id}`} target="_blank" rel="noopener noreferrer" className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative aspect-video bg-line">
              <Image src={ytThumb(p.youtube_id)} alt={p.title} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover" />
              <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/30">
                <ExternalLink className="text-white opacity-0 transition group-hover:opacity-100" />
              </span>
            </div>
            <div className="p-3">
              <p className="line-clamp-2 font-medium">{p.title}</p>
              <p className="mt-1 text-xs text-muted">{p.date_added}</p>
            </div>
          </a>
        ))}
        {list.length === 0 && <p className="card col-span-full p-10 text-center text-muted">Belum ada podcast.</p>}
      </div>
    </div>
  );
}
