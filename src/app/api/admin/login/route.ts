import { NextResponse } from "next/server";
import { ADMIN_COOKIE, COOKIE_OPTS, checkPassword, createToken } from "@/lib/auth";
import { clear, clientIp, hit } from "@/lib/rateLimit";

const MAX_ATTEMPTS = 5; // per IP
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  // CSRF: only accept logins posted from our own origin.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ ok: false, error: "Asal permintaan tidak sah" }, { status: 403 });
  }

  const ip = clientIp(req);
  const limit = hit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfter / 60);
    return NextResponse.json(
      { ok: false, error: `Terlalu banyak cubaan. Cuba lagi dalam ${mins} minit.` },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  const started = Date.now();
  const ok = password.length > 0 && checkPassword(password);
  // Constant-ish response time so success/failure can't be told apart by timing.
  await sleep(Math.max(0, 700 - (Date.now() - started)));

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: limit.remaining > 0 ? `Kata laluan salah (${limit.remaining} cubaan lagi)` : "Kata laluan salah" },
      { status: 401 },
    );
  }
  clear(`login:${ip}`);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createToken(), COOKIE_OPTS);
  res.headers.set("cache-control", "no-store");
  return res;
}
