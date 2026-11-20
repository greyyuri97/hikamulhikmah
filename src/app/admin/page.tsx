import { isAdmin } from "@/lib/auth";
import { getNotes, getPodcasts, getVideos, sheetsConfigured } from "@/lib/googleSheets";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [bukhari, muslim, fawaid, videos, podcasts] = await Promise.all([
    getNotes("bukhari"), getNotes("muslim"), getNotes("fawaid"), getVideos(), getPodcasts(),
  ]);
  return <AdminDashboard configured={sheetsConfigured()} data={{ bukhari, muslim, fawaid, videos, podcasts }} />;
}
