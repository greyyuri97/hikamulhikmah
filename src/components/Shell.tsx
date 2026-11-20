"use client";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, Moon, Sun, BookOpenText } from "lucide-react";
import Logo from "./Logo";
import { NAV } from "./nav";
import { useApp, type Theme } from "./Providers";
import BookmarksDrawer from "./BookmarksDrawer";
import DisplaySettings from "./DisplaySettings";
import AdminAccess from "./AdminAccess";

const THEMES: { t: Theme; icon: typeof Sun; label: string }[] = [
  { t: "light", icon: Sun, label: "Cerah" },
  { t: "sepia", icon: BookOpenText, label: "Sepia" },
  { t: "dark", icon: Moon, label: "Gelap" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme, bumpScale, bookmarks, setDrawerOpen } = useApp();
  const [splash, setSplash] = useState(false);
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem("hk-splash") === "1";
      sessionStorage.setItem("hk-splash", "1");
    } catch {}
    if (!seen && !isAdmin) {
      setSplash(true);
      const t = setTimeout(() => setSplash(false), 1500);
      requestAnimationFrame(() => document.documentElement.removeAttribute("data-splash"));
      return () => clearTimeout(t);
    }
    document.documentElement.removeAttribute("data-splash");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <LayoutGroup>
      <AnimatePresence>
        {splash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F5F4F0]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <motion.div
              layoutId="brand-logo-emblem"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Logo size="lg" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div aria-hidden className="geo-pattern pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex h-12 items-center" aria-label="Laman Utama">
            {!splash && (
              <motion.div layoutId="brand-logo-emblem" transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                <Logo />
              </motion.div>
            )}
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.slice(1).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${active(n.href) ? "bg-accent/10 font-semibold text-accent" : "text-muted hover:text-ink"}`}
              >
                {n.short}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {/* Desktop/tablet: inline controls */}
            <div className="hidden items-center gap-1 sm:flex">
            <div className="flex items-center rounded-lg border border-line bg-surface">
              <button onClick={() => bumpScale(-0.05)} className="px-2 py-1.5 text-xs font-semibold text-muted hover:text-ink" aria-label="Kecilkan teks">A-</button>
              <span className="h-4 w-px bg-line" />
              <button onClick={() => bumpScale(0.05)} className="px-2 py-1.5 text-sm font-semibold text-muted hover:text-ink" aria-label="Besarkan teks">A+</button>
            </div>
            <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
              {THEMES.map(({ t, icon: I, label }) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-md p-1.5 ${theme === t ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
                  aria-label={label}
                  title={label}
                >
                  <I size={14} />
                </button>
              ))}
            </div>
            </div>
            {/* Phone: one 44px button opens the same controls with full-size targets */}
            <DisplaySettings />
            <button onClick={() => setDrawerOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-lg text-muted hover:text-accent" aria-label="Simpanan Saya">
              <Bookmark size={18} />
              {bookmarks.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {bookmarks.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <motion.main
        initial={false}
        animate={{ opacity: splash ? 0 : 1 }}
        transition={{ duration: 0.6, delay: splash ? 0 : 0.2 }}
        className="pb-safe mx-auto min-h-[70vh] max-w-6xl px-4 pt-6"
      >
        {children}
        {!isAdmin && (
          <footer className="no-print mt-16 space-y-2 border-t border-line pt-6 text-center text-xs text-muted">
            <p><span dir="rtl" className="font-arabic text-sm">حِكَمُ الحِكْمَةِ</span> · Intisari Kebijaksanaan</p>
            <p className="opacity-70">© {new Date().getFullYear()} · Portal Ilmu &amp; Talaqqi</p>
            <AdminAccess />
          </footer>
        )}
      </motion.main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-6">
          {NAV.map(({ href, short, icon: I }) => (
            <Link key={href} href={href} className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] ${active(href) ? "text-accent" : "text-muted"}`}>
              <I size={20} strokeWidth={active(href) ? 2.4 : 1.8} />
              {short}
            </Link>
          ))}
        </div>
      </nav>
      <BookmarksDrawer />
    </LayoutGroup>
  );
}
