import { NextResponse } from "next/server";
import { extractYoutubeId } from "@/lib/utils";
import { clientIp, hit } from "@/lib/rateLimit";

export async function GET(req: Request) {
  if (!hit(`oembed:${clientIp(req)}`, 30, 60_000).allowed) return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });
  const url = new URL(req.url).searchParams.get("url") || "";
  const id = extractYoutubeId(url);
  if (!id) return NextResponse.json({ error: "URL tidak sah" }, { status: 400 });
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!r.ok) throw new Error();
    const d = await r.json();
    return NextResponse.json({ id, title: d.title as string, author: d.author_name as string });
  } catch {
    return NextResponse.json({ id, title: "" });
  }
}
