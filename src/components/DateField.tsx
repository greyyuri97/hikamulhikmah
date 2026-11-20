"use client";
import { CalendarDays } from "lucide-react";
import { useRef } from "react";
import { formatDateMs, todayISO } from "@/lib/utils";

/**
 * Native calendar date picker. Value is always YYYY-MM-DD.
 * Tapping anywhere on the field opens the native calendar (iOS/Android/desktop).
 */
export default function DateField({
  value, onChange, label = "Tarikh", max,
}: { value: string; onChange: (v: string) => void; label?: string; max?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    try { el?.showPicker?.(); } catch { /* unsupported or not user-initiated */ }
  };
  const today = todayISO();
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-muted">
        {label}
        {value && <span className="font-semibold text-accent">{formatDateMs(value)}</span>}
      </span>
      <span className="relative block">
        <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
        <input
          ref={ref}
          type="date"
          required
          className="input date-input cursor-pointer pl-9"
          value={value}
          max={max}
          onClick={open}
          onChange={(e) => onChange(e.target.value || today)}
          aria-label={label}
        />
      </span>
      {value !== today && (
        <button type="button" onClick={() => onChange(today)} className="mt-1 text-xs text-accent hover:underline">
          Guna tarikh hari ini
        </button>
      )}
    </label>
  );
}
