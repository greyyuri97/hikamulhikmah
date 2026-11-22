"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useApp } from "./Providers";

/** Single Light/Dark toggle: shows the mode you'll switch TO (Moon in light, Sun in dark). */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  const dark = theme === "dark";
  const label = dark ? "Tukar ke Mod Cerah" : "Tukar ke Mod Gelap";
  return (
    <button
      onClick={toggleTheme}
      className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-lg text-muted transition-colors hover:bg-accent/10 hover:text-accent"
      aria-label={label}
      title={label}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "sun" : "moon"}
          initial={{ y: 10, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -10, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.18 }}
          className="grid place-items-center"
        >
          {dark ? <Sun size={19} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
