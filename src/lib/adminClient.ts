"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Logs out of admin, then returns to the public Home page with fresh server state. */
export function useExitAdmin(onDone?: () => void) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const exit = useCallback(async () => {
    setLeaving(true);
    try {
      await fetch("/api/admin/logout", { method: "POST", cache: "no-store" });
    } finally {
      onDone?.();
      router.push("/");
      router.refresh();
      setLeaving(false);
    }
  }, [router, onDone]);
  return { exit, leaving };
}

/**
 * Run admin mutations strictly one after another from this browser. Vercel may send two
 * overlapping requests to different server instances, where the server-side lock can't see each
 * other — so we also queue on the client.
 */
let chain: Promise<unknown> = Promise.resolve();
const listeners = new Set<(busy: boolean) => void>();
let pending = 0;
const emit = () => listeners.forEach((l) => l(pending > 0));
export function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  pending++; emit();
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined).finally(() => { pending--; emit(); });
  return run;
}
export function useAdminBusy() {
  const [busy, setBusy] = useState(pending > 0);
  useEffect(() => { listeners.add(setBusy); return () => { listeners.delete(setBusy); }; }, []);
  return busy;
}
