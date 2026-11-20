import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ContinueCard from "@/components/ContinueCard";
import GlobalSearch, { type SearchItem } from "@/components/GlobalSearch";
import { getNotes, getPodcasts, getTranscripts, getVideos } from "@/lib/googleSheets";
import { NOTE_SECTIONS } from "@/lib/sections";
import { NAV } from "@/components/nav";
import { dateValue, formatDateMs } from "@/lib/utils";

export const revalidate = 600;

export default async function Home() {
  const [bukhari, muslim, fawaid, videos, transcripts, podcasts] = await Promise.all([
    getNotes("bukhari"), getNotes("muslim"), getNotes("fawaid"), getVideos(), getTranscripts(), getPodcasts(),
  ]);
  const vmap = new Map(videos.map((v) => [v.video_id, v]));
  const noteSets = [
    [NOTE_SECTIONS.bukhari, bukhari], [NOTE_SECTIONS.muslim, muslim], [NOTE_SECTIONS.fawaid, fawaid],
  ] as const;

  const items: SearchItem[] = [
    ...noteSets.flatMap(([s, list]) =>
      list.map((n) => ({ section: s.title, title: `Tarikh: ${formatDateMs(n.date)}`, text: n.content, href: `${s.href}#${n.note_id}` })),
    ),
    ...videos.map((v) => ({ section: "Dars Syeikhuna — Video", title: v.title_malay, text: `${v.title_arabic} ${v.series_name} ${v.category}`, href: `/dars-syeikhuna/watch/${v.video_id}` })),
    ...transcripts.map((t) => ({
      section: "Dars Syeikhuna — Transkrip",
      title: vmap.get(t.video_id)?.title_malay ?? "Transkrip",
      text: `${t.malay_translation} ${t.arabic_text}`,
      href: `/dars-syeikhuna/watch/${t.video_id}?t=${t.time_seconds}`,
      badge: t.time_display,
    })),
    ...podcasts.map((p) => ({ section: "Podcast Hikmah", title: p.title, text: p.title, href: `https://www.youtube.com/watch?v=${p.youtube_id}` })),
  ];

  const latest = [
    ...noteSets.flatMap(([s, list]) => list.map((n) => ({ section: s.title, title: n.content.split("\n")[0].slice(0, 110), date: n.date, href: `${s.href}#${n.note_id}` }))),
    ...podcasts.map((p) => ({ section: "Podcast Hikmah", title: p.title, date: p.date_added, href: "/podcast-hikmah" })),
  ]
    .sort((a, b) => dateValue(b.date) - dateValue(a.date))
    .slice(0, 4);

  const counts: Record<string, number> = {
    "/dars-bukhari": bukhari.length, "/dars-muslim": muslim.length, "/fawaid-zahabiyyah": fawaid.length,
    "/dars-syeikhuna": videos.length, "/podcast-hikmah": podcasts.length,
  };

  return (
    <div className="space-y-10">
      <section className="pt-2 text-center">
        <p dir="rtl" className="font-arabic text-xl text-accent">مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">Portal Ilmu & Talaqqi</h1>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted">Himpunan nota pengajian, dars video bertranskrip dwi-bahasa dan podcast hikmah — terbuka untuk semua.</p>
      </section>
      <div className="space-y-3">
        <GlobalSearch items={items} />
        <ContinueCard />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {NAV.slice(1).map(({ href, label, icon: I }) => (
          <Link key={href} href={href} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><I size={20} /></span>
            <span className="font-serif font-semibold leading-snug">{label}</span>
            <span className="mt-auto flex items-center justify-between text-xs text-muted">
              {counts[href]} entri <ArrowRight size={14} className="transition group-hover:translate-x-1 group-hover:text-accent" />
            </span>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Terkini</h2>
        {latest.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">Belum ada kandungan. Admin boleh menambah melalui /admin.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {latest.map((l, i) => (
              <Link key={i} href={l.href} className="card block p-4 hover:border-accent/50">
                <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-accent">{l.section}</span><span className="text-muted">{formatDateMs(l.date)}</span></div>
                <p className="line-clamp-2 text-sm" dir="auto">{l.title}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
