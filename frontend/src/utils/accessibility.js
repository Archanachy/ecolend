// Accessibility preferences, persisted in localStorage and applied to the
// document root as CSS custom properties / data attributes. The design-system
// stylesheet reads these (font scale multiplies the type tokens; the data
// attributes drive high-contrast and reduced-motion rules).
const KEY = 'ecolend-a11y';
const DEFAULTS = { fontScale: 1, highContrast: false, reducedMotion: false };

export function getA11ySettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function applyA11ySettings(settings = getA11ySettings()) {
  const root = document.documentElement;
  root.style.setProperty('--a11y-font-scale', String(settings.fontScale));
  root.style.fontSize = `${settings.fontScale * 100}%`;
  root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
  root.dataset.motion = settings.reducedMotion ? 'reduced' : 'normal';
}

export function saveA11ySettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
  applyA11ySettings(settings);
}

export const FONT_SCALES = [
  { label: 'Small', value: 0.9 },
  { label: 'Default', value: 1 },
  { label: 'Large', value: 1.15 },
  { label: 'Largest', value: 1.3 },
];
