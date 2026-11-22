"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** Older versions stored "sepia"; anything that isn't "dark" becomes the default light theme. */
export const normalizeTheme = (v: unknown): Theme => (v === "dark" ? "dark" : "light");
export interface Bookmark {
  id: string;
  kind: "note" | "transcript" | "video" | "podcast";
  section: string;
  title: string;
  snippet: string;
  href: string;
  savedAt: number;
}

interface Ctx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  scale: number;
  bumpScale: (d: number) => void;
  bookmarks: Bookmark[];
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (b: Omit<Bookmark, "savedAt">) => void;
  drawerOpen: boolean;
  setDrawerOpen: (o: boolean) => void;
}
const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(C);
  if (!c) throw new Error("useApp outside Providers");
  return c;
};

const read = <T,>(k: string, fb: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setThemeS] = useState<Theme>("light");
  const [scale, setScale] = useState(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setThemeS(normalizeTheme(read<string>("hk-theme", "light")));
    setScale(read<number>("hk-scale", 1));
    setBookmarks(read<Bookmark[]>("hk-bookmarks", []));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    write("hk-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(scale));
    write("hk-scale", scale);
  }, [scale]);

  const bumpScale = useCallback((d: number) => setScale((s) => Math.min(1.4, Math.max(0.85, +(s + d).toFixed(2)))), []);
  const toggleBookmark = useCallback((b: Omit<Bookmark, "savedAt">) => {
    setBookmarks((prev) => {
      const next = prev.some((x) => x.id === b.id) ? prev.filter((x) => x.id !== b.id) : [{ ...b, savedAt: Date.now() }, ...prev];
      write("hk-bookmarks", next);
      return next;
    });
  }, []);

  return (
    <C.Provider
      value={{
        theme,
        setTheme: setThemeS,
        toggleTheme: () => setThemeS((t) => (t === "dark" ? "light" : "dark")),
        scale,
        bumpScale,
        bookmarks,
        isBookmarked: (id) => bookmarks.some((b) => b.id === id),
        toggleBookmark,
        drawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </C.Provider>
  );
}
