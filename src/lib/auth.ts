import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_COOKIE = "hikam_admin";
const MAX_AGE = 60 * 60 * 12; // 12h

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    // Never sign sessions with a guessable key in production; with no secret nobody can log in.
    console.error("[auth] ADMIN_SESSION_SECRET missing or shorter than 32 chars — admin login disabled");
    return null;
  }
  return "dev-only-secret-not-for-production-use-000000";
}
function sign(payload: string, key = secret()) {
  if (!key) return null;
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}
export function createToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}
export function verifyToken(token?: string) {
  if (!token) return false;
  const [exp, sig, extra] = token.split(".");
  if (extra !== undefined || !/^\d{13}$/.test(exp ?? "") || !/^[a-f0-9]{64}$/.test(sig ?? "")) return false;
  if (Number(exp) < Date.now() || Number(exp) > Date.now() + MAX_AGE * 1000 + 60_000) return false;
  const good = sign(exp);
  return !!good && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}
export function checkPassword(input: string) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !secret()) return false;
  // Compare fixed-length HMACs so the comparison is constant-time regardless of input length.
  const a = Buffer.from(sign(input)!), b = Buffer.from(sign(pw)!);
  return crypto.timingSafeEqual(a, b);
}
export async function isAdmin() {
  const c = await cookies();
  return verifyToken(c.get(ADMIN_COOKIE)?.value);
}
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const, // strict would hide admin state when arriving from a WhatsApp link
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};
