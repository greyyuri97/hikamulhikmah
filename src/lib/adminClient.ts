"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

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
