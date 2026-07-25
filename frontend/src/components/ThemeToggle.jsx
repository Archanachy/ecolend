// Light / Dark / System theme switcher (v2). Applies immediately and persists.
import { useState } from 'react';
import { THEMES, getTheme, saveTheme } from '../utils/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme);

  function choose(value) {
    setTheme(value);
    saveTheme(value);
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-pressed={theme === t.value}
          title={t.label}
          aria-label={t.label}
          onClick={() => choose(t.value)}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
