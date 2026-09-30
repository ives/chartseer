"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

// Dev only: forces a theme with html[data-theme], so both can be checked and
// captured without changing the system setting (D-049).
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  return (
    <fieldset className="flex items-center gap-3 text-sm">
      <legend className="sr-only">Theme</legend>
      {(["system", "light", "dark"] as const).map((option) => (
        <label key={option} className="flex items-center gap-1">
          <input type="radio" name="theme" value={option} checked={theme === option} onChange={() => setTheme(option)} />
          {option[0]?.toUpperCase() + option.slice(1)}
        </label>
      ))}
    </fieldset>
  );
}
