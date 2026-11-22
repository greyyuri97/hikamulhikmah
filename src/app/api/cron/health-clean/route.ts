import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAdmin } from "@/lib/auth";
import { runHealthClean } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; a logged-in admin may also trigger it. */
function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16) return false;
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const viaCron = cronAuthorized(req);
  if (!viaCron && !(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const report = await runHealthClean();
  console.log(`[health-clean] ${viaCron ? "cron" : "admin"} ok=${report.ok} ${report.durationMs}ms`,
    JSON.stringify(report.tabs.map((t) => ({ tab: t.tab, rows: t.dataRows, header: t.header, trimmed: t.blankRowsRemoved, dupes: t.duplicateIds.length }))));
  return NextResponse.json(report, { status: report.ok ? 200 : 207, headers: { "cache-control": "no-store" } });
}
