import KitabNotesView from "@/components/KitabNotesView";
import { getNotes } from "@/lib/googleSheets";
import { isAdmin } from "@/lib/auth";
import { NOTE_SECTIONS } from "@/lib/sections";

const S = NOTE_SECTIONS.bukhari;
export const metadata = { title: S.title };
export const revalidate = 600;

export default async function Page() {
  const [notes, admin] = await Promise.all([getNotes("bukhari"), isAdmin()]);
  return (
    <KitabNotesView
      notes={notes.map(({ _row, ...n }) => n)}
      sectionKey={S.key}
      title={S.title}
      arabic={S.arabic}
      blurb={S.blurb}
      href={S.href}
      admin={admin}
    />
  );
}
