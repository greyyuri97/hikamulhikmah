import { NextResponse } from "next/server";
import { ADMIN_COOKIE, COOKIE_OPTS, checkPassword, createToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!checkPassword(String(password || ""))) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ ok: false, error: "Kata laluan salah" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createToken(), COOKIE_OPTS);
  return res;
}
