"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ProfileTheme } from "@/types/database";

const THEMES: { id: ProfileTheme | null; label: string; swatch: string }[] = [
  { id: null, label: "Classic", swatch: "#cc0000" },
  { id: "frost", label: "Frost", swatch: "#2563eb" },
  { id: "venom", label: "Venom", swatch: "#16a34a" },
  { id: "ash", label: "Ash", swatch: "#6b7280" },
];

interface ThemeSelectorProps {
  currentTheme: ProfileTheme | null;
  isPremium: boolean;
}

export function ThemeSelector({ currentTheme, isPremium }: ThemeSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentTheme);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSelect(theme: ProfileTheme | null) {
    if (!isPremium) {
      window.location.href = "/api/billing/checkout";
      return;
    }
    if (theme === selected || isSaving) return;

    setIsSaving(true);
    const response = await fetch("/api/profile/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
    setIsSaving(false);

    if (response.ok) {
      setSelected(theme);
      router.refresh();
    }
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-metal text-lg text-text">
        PROFILE ACCENT
        {!isPremium && (
          <span className="rounded-full border border-gold px-2 py-0.5 text-[10px] font-bold text-gold">
            TRVE PASS
          </span>
        )}
      </h2>
      <div className="flex gap-3">
        {THEMES.map((theme) => (
          <button
            key={theme.label}
            type="button"
            onClick={() => handleSelect(theme.id)}
            disabled={isSaving}
            title={isPremium ? theme.label : `${theme.label} — requires TRVE PASS`}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-opacity",
              selected === theme.id && isPremium ? "border-text" : "border-border",
              !isPremium && "opacity-40"
            )}
          >
            <span className="h-8 w-8 rounded-full" style={{ backgroundColor: theme.swatch }} />
          </button>
        ))}
      </div>
      {!isPremium && (
        <p className="mt-2 text-xs text-text-muted">Unlock alternate color accents with TRVE PASS.</p>
      )}
    </section>
  );
}
