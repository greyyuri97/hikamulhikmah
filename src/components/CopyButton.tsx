"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export default function CopyButton({ text, label = "Salin", className = "" }: { text: string | (() => string); label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`btn-ghost no-print ${done ? "!text-accent" : ""} ${className}`}
      onClick={async () => {
        await copyText(typeof text === "function" ? text() : text);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      aria-label={label}
    >
      {done ? <Check size={16} /> : <Copy size={16} />}
      <span className="text-xs">{done ? "✓ Disalin" : label}</span>
    </button>
  );
}
