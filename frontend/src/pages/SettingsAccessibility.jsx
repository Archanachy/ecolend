// Accessibility settings: font size, high contrast, reduced motion. Applied
// live and persisted per browser.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getA11ySettings, saveA11ySettings, FONT_SCALES } from '../utils/accessibility';

export default function SettingsAccessibility() {
  const [settings, setSettings] = useState(getA11ySettings());

  function update(next) {
    setSettings(next);
    saveA11ySettings(next);
  }

  return (
    <div className="container-sm">
      <p className="text-sm"><Link to="/settings">← Settings</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Accessibility</h1>
        </div>
      </div>

      <div className="card">
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, marginBottom: 'var(--space-2)', padding: 0 }}>Text size</legend>
          <div className="row">
            {FONT_SCALES.map((f) => (
              <label key={f.value} style={{ fontWeight: 500, marginBottom: 0 }}>
                <input
                  type="radio"
                  name="fontScale"
                  checked={settings.fontScale === f.value}
                  onChange={() => update({ ...settings, fontScale: f.value })}
                />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>

        <hr />

        <div className="stack">
          <label style={{ fontWeight: 500, marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => update({ ...settings, highContrast: e.target.checked })}
            />
            High contrast
          </label>
          <label style={{ fontWeight: 500, marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => update({ ...settings, reducedMotion: e.target.checked })}
            />
            Reduce motion
          </label>
        </div>
      </div>
    </div>
  );
}
