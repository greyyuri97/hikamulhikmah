"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Settings2, Unlock, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useExitAdmin } from "@/lib/adminClient";

/** Discreet footer entry point to /admin — needed when installed as a PWA (no address bar). */
export default function AdminAccess() {
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { exit, leaving } = useExitAdmin(useCallback(() => setAdmin(false), []));

  useEffect(() => {
    fetch("/api/admin/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAdmin(Boolean(d.admin)))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => input.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      setOpen(false); setPw(""); setAdmin(true);
      router.push("/admin");
      router.refresh();
    } else {
      setErr(r ? (await r.json().catch(() => null))?.error || "PIN / kata laluan salah" : "Tiada sambungan");
      setPw("");
      input.current?.focus();
    }
  };

  return (
    <>
      <div className="flex items-center justify-center gap-2">
        {admin ? (
          <>
            <button
              type="button"
              onClick={exit}
              disabled={leaving}
              className="tap inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
              aria-label="Keluar Mod Admin"
              title="Keluar ke paparan awam"
            >
              <Unlock size={12} /> {leaving ? "Keluar…" : "Admin Mode (Keluar)"}
            </button>
            <Link href="/admin" className="tap rounded-full p-2 text-muted opacity-60 hover:text-accent hover:opacity-100" aria-label="Buka Panel Admin" title="Panel Admin">
              <Settings2 size={13} />
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tap rounded-full p-2 text-muted opacity-40 transition-opacity hover:opacity-80 focus-visible:opacity-80"
            aria-label="Akses Admin"
            title="Admin"
          >
            <Lock size={13} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.form
              onSubmit={submit}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 16, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="card relative w-full max-w-xs space-y-4 p-5 shadow-xl"
              role="dialog" aria-modal="true" aria-label="Log masuk admin"
            >
              <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 text-muted hover:text-ink" aria-label="Tutup"><X size={16} /></button>
              <div className="flex flex-col items-center gap-2 pt-1 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent/10 text-accent"><Lock size={20} /></span>
                <h2 className="font-serif text-lg font-semibold">Akses Admin</h2>
              </div>
              <input
                ref={input}
                type="password"
                autoComplete="current-password"
                className="input text-center text-lg tracking-[0.4em]"
                placeholder="••••"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setErr(""); }}
                aria-label="PIN atau kata laluan"
              />
              {err && <p className="text-center text-sm text-red-600">{err}</p>}
              <button className="btn-accent w-full" disabled={busy || !pw}>{busy ? "Menyemak…" : "Masuk Admin"}</button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
