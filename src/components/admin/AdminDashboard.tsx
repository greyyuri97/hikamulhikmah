"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Database, RefreshCw } from "lucide-react";
import { useExitAdmin } from "@/lib/adminClient";
import type { DarsVideo, Note, Podcast } from "@/lib/types";
import { NOTE_SECTIONS } from "@/lib/sections";
import { refreshCache, setupTabs, syncIds } from "@/lib/actions";
import { runExclusive } from "@/lib/adminClient";
import NotesAdmin from "./NotesAdmin";
import DarsGenerator from "./DarsGenerator";
import PodcastAdmin from "./PodcastAdmin";

type Data = { bukhari: Note[]; muslim: Note[]; fawaid: Note[]; videos: DarsVideo[]; podcasts: Podcast[] };
const TABS = [
  { k: "bukhari", label: "Bukhari" },
  { k: "muslim", label: "Muslim" },
  { k: "fawaid", label: "Fawaid" },
  { k: "dars", label: "Dars Syeikhuna" },
  { k: "podcast", label: "Podcast" },
] as const;

export default function AdminDashboard({ data, configured }: { data: Data; configured: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("bukhari");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const { exit, leaving } = useExitAdmin();

  // Rows typed directly into the Sheet have no id yet; give them one so they can be edited safely.
  useEffect(() => {
    if (!configured) return;
    // Once per browser session — it reads every tab, so don't repeat it on each refresh.
    try { if (sessionStorage.getItem("hk-ids-synced") === "1") return; sessionStorage.setItem("hk-ids-synced", "1"); } catch {}
    runExclusive(() => syncIds()).then((r) => {
      if (r.ok && Number(r.id) > 0) { setMsg(`✓ ${r.id} rekod dari Sheet diberi ID`); router.refresh(); }
    });
  }, [configured, router]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-semibold">Pusat Kawalan Admin</h1>
        <div className="flex gap-2">
          <button className="btn-ghost border border-line" title="Paksa semua seksyen membaca semula Google Sheet" onClick={async () => {
            const r = await runExclusive(() => refreshCache());
            setMsg(r.ok ? "✓ Cache dimuat semula — data terkini dari Google Sheet" : r.error);
            router.refresh();
          }}>
            <RefreshCw size={14} /> Muat Semula Cache
          </button>
          <button className="btn-ghost border border-line" onClick={async () => { const r = await setupTabs(); setMsg(r.ok ? `Tab disediakan: ${r.id}` : r.error); router.refresh(); }}>
            <Database size={14} /> Sediakan Tab Sheets
          </button>
          <button className="btn-accent" onClick={exit} disabled={leaving} title="Lihat Paparan Awam">
            <LogOut size={14} /> {leaving ? "Keluar…" : "Keluar Mod Admin"}
          </button>
        </div>
      </div>
      {!configured && <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">Google Sheets belum dikonfigurasi. Isi <code>.env.local</code> (lihat README).</p>}
      {msg && <p className="mb-4 rounded-lg bg-accent/10 p-3 text-sm text-accent">{msg}</p>}

      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1 sm:flex" role="tablist">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} role="tab" aria-selected={tab === t.k} className={`min-h-[44px] whitespace-nowrap rounded-lg px-3 py-2 text-sm sm:px-4 ${t.k === "dars" ? "col-span-2" : ""} ${tab === t.k ? "bg-accent font-semibold text-white" : "text-muted hover:text-ink"}`}>{t.label}</button>
        ))}
      </div>

      {(tab === "bukhari" || tab === "muslim" || tab === "fawaid") && (
        <NotesAdmin key={tab} sectionKey={tab} title={NOTE_SECTIONS[tab].title} notes={data[tab]} />
      )}
      {tab === "dars" && <DarsGenerator videos={data.videos} />}
      {tab === "podcast" && <PodcastAdmin podcasts={data.podcasts} />}
    </div>
  );
}
