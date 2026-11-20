import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_COOKIE = "hikam_admin";
const MAX_AGE = 60 * 60 * 12; // 12h

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret";
}
function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}
export function createToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}
export function verifyToken(token?: string) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return good.length === sig.length && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}
export function checkPassword(input: string) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(sign(input)), b = Buffer.from(sign(pw));
  return crypto.timingSafeEqual(a, b);
}
export async function isAdmin() {
  const c = await cookies();
  return verifyToken(c.get(ADMIN_COOKIE)?.value);
}
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};
