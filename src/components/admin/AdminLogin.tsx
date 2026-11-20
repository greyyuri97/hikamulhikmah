"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="card mx-auto mt-10 max-w-sm space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr("");
        const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
        setBusy(false);
        if (r.ok) router.refresh(); else setErr((await r.json().catch(() => null))?.error || "Kata laluan salah");
      }}
    >
      <div className="flex items-center gap-2"><Lock className="text-accent" size={20} /><h1 className="font-serif text-xl font-semibold">Admin</h1></div>
      <input type="password" className="input" placeholder="PIN / kata laluan" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn-accent w-full" disabled={busy}>{busy ? "Menyemak…" : "Masuk"}</button>
    </form>
  );
}
