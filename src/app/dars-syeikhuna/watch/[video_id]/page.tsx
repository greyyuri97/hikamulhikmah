import { notFound } from "next/navigation";
import WatchView from "@/components/WatchView";
import { getTranscripts, getVideos } from "@/lib/googleSheets";

export const revalidate = 600;

type P = { params: Promise<{ video_id: string }>; searchParams: Promise<{ t?: string }> };

export async function generateMetadata({ params }: P) {
  const { video_id } = await params;
  const v = (await getVideos()).find((x) => x.video_id === video_id);
  return { title: v?.title_malay ?? "Dars Syeikhuna" };
}

export default async function Page({ params, searchParams }: P) {
  const [{ video_id }, { t }] = await Promise.all([params, searchParams]);
  const [videos, rows] = await Promise.all([getVideos(), getTranscripts(video_id)]);
  const video = videos.find((v) => v.video_id === video_id);
  if (!video) notFound();
  const { _row, ...v } = video;
  return <WatchView video={v} rows={rows} startAt={Number(t) || 0} />;
}
