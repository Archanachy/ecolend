// Live password strength meter (zxcvbn, 0-4). Colour is backed by a text label
// so strength is never conveyed by colour alone (accessibility). When weak, it
// surfaces one specific, actionable hint.
const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = [
  'var(--color-danger)',
  'var(--color-warning)',
  'var(--color-warning)',
  'var(--color-success)',
  'var(--color-success)',
];

export default function PasswordStrengthMeter({ result }) {
  if (!result) return null;
  const { score, feedback } = result;
  const hint = feedback?.warning || feedback?.suggestions?.[0];

  return (
    <div aria-live="polite" style={{ margin: '8px 0 4px' }}>
      <div style={{ height: 6, background: 'var(--color-neutral-200)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${(score + 1) * 20}%`,
            height: '100%',
            background: COLORS[score],
            borderRadius: 'var(--radius-pill)',
            transition: 'width 160ms, background 160ms',
          }}
        />
      </div>
      <small className="muted">
        Strength: <strong style={{ color: COLORS[score] }}>{LABELS[score]}</strong>
        {score < 2 && hint ? ` — ${hint}` : ''}
      </small>
    </div>
  );
}
