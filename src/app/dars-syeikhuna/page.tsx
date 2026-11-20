import DarsDirectory from "@/components/DarsDirectory";
import { getTranscripts, getVideos } from "@/lib/googleSheets";

export const metadata = { title: "Dars Syeikhuna" };
export const revalidate = 600;

export default async function Page() {
  const [videos, transcripts] = await Promise.all([getVideos(), getTranscripts()]);
  return <DarsDirectory videos={videos.map(({ _row, ...v }) => v)} transcripts={transcripts} />;
}
