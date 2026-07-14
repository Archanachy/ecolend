// Live password strength meter (zxcvbn, 0-4). Colour is backed by a text label
// so strength is never conveyed by colour alone (accessibility). When weak, it
// surfaces one specific, actionable hint.
const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['#B91C1C', '#B45309', '#B45309', '#15803D', '#15803D'];

export default function PasswordStrengthMeter({ result }) {
  if (!result) return null;
  const { score, feedback } = result;
  const hint = feedback?.warning || feedback?.suggestions?.[0];

  return (
    <div aria-live="polite" style={{ margin: '4px 0 8px' }}>
      <div style={{ height: 6, background: '#D1D5DB', borderRadius: 3 }}>
        <div
          style={{
            width: `${(score + 1) * 20}%`,
            height: '100%',
            background: COLORS[score],
            borderRadius: 3,
            transition: 'width 120ms',
          }}
        />
      </div>
      <small>
        Strength: {LABELS[score]}
        {score < 2 && hint ? ` — ${hint}` : ''}
      </small>
    </div>
  );
}
