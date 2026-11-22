"use client";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

/**
 * Shown only if Google Sheets can't be reached AND no earlier good copy exists. Data reads throw
 * instead of returning [], so a temporary outage can never be cached and shown as "0 entri".
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p dir="rtl" className="font-arabic text-2xl text-accent">صبرًا</p>
      <h1 className="mt-2 font-serif text-xl font-semibold">Kandungan tidak dapat dimuatkan buat seketika</h1>
      <p className="mt-2 text-sm text-muted">Sambungan ke pangkalan data terganggu. Data anda selamat — sila cuba lagi sebentar.</p>
      <button onClick={reset} className="btn-accent mt-6"><RefreshCw size={15} /> Cuba Lagi</button>
    </div>
  );
}
