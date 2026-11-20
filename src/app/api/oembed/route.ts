import { NextResponse } from "next/server";
import { extractYoutubeId } from "@/lib/utils";

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") || "";
  const id = extractYoutubeId(url);
  if (!id) return NextResponse.json({ error: "URL tidak sah" }, { status: 400 });
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
    );
    if (!r.ok) throw new Error();
    const d = await r.json();
    return NextResponse.json({ id, title: d.title as string, author: d.author_name as string });
  } catch {
    return NextResponse.json({ id, title: "" });
  }
}
