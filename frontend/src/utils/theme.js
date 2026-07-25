// Colour-theme preference (v2). Persisted per browser and applied to the
// document root as data-theme, which the design tokens read. 'system' follows
// the OS setting live via matchMedia.
const KEY = 'ecolend-theme';
export const THEMES = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    return THEMES.some((t) => t.value === saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

function prefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(theme = getTheme()) {
  const resolved = theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable — still apply for this session */
  }
  return applyTheme(theme);
}

// Keep 'system' in sync when the OS preference changes.
export function watchSystemTheme() {
  if (!window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (getTheme() === 'system') applyTheme('system');
  };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
