"use client";
import { useEffect, useRef, useState } from "react";

/** Uses /logo.png if present; falls back to typographic calligraphy. */
export default function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // onError may fire before hydration; re-check once mounted.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  const lg = size === "lg";
  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={img}
        src="/logo.png"
        alt="حِكَمُ الحِكْمَةِ — Intisari Kebijaksanaan"
        onError={() => setFailed(true)}
        className={lg ? "h-28 w-auto sm:h-36 dark-invert" : "h-10 w-auto dark-invert"}
      />
    );
  }
  return (
    <div className="flex flex-col items-center leading-none">
      <span dir="rtl" lang="ar" className={`font-ruqaa text-ink ${lg ? "text-6xl sm:text-7xl" : "text-2xl"}`}>
        حِكَمُ الحِكْمَةِ
      </span>
      <span
        className={`font-serif uppercase text-accent ${lg ? "mt-4 text-sm tracking-[0.35em]" : "mt-0.5 text-[0.55rem] tracking-[0.25em]"}`}
      >
        Intisari Kebijaksanaan
      </span>
    </div>
  );
}
