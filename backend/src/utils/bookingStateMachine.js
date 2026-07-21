// The booking state machine — the single source of truth for which transitions
// are legal and who may trigger them. Enforced server-side: any action not
// listed here, from the wrong current status, or by the wrong role is rejected.
// Note: `approved -> paid` is intentionally NOT here — it is applied only by the
// Khalti payment verification (see the payment controller), never by a client
// status request. `disputed -> resolved` is admin-only via the admin route.
//
//   requested -> approved -> paid -> active -> returned -> completed
//                                                    \--> disputed -> resolved
//   requested -> cancelled
//   approved  -> cancelled
const TRANSITIONS = {
  approve: { from: ['requested'], to: 'approved', by: 'lender' },
  reject: { from: ['requested'], to: 'cancelled', by: 'lender' },
  cancel: { from: ['requested', 'approved'], to: 'cancelled', by: 'either' },
  handover: { from: ['paid'], to: 'active', by: 'lender' },
  return: { from: ['active'], to: 'returned', by: 'borrower' },
  complete: { from: ['returned'], to: 'completed', by: 'lender' },
  dispute: { from: ['returned'], to: 'disputed', by: 'lender' },
};

const TERMINAL = new Set(['completed', 'resolved', 'cancelled']);

// Evaluates an action against a booking and the acting user. Returns a result
// with an HTTP status code so the controller can respond consistently:
//   400 unknown action · 409 illegal transition · 403 wrong role.
function evaluate(action, booking, userId) {
  const rule = TRANSITIONS[action];
  if (!rule) return { ok: false, code: 400, error: 'Unknown action' };

  if (!rule.from.includes(booking.status)) {
    return { ok: false, code: 409, error: `Cannot ${action} a ${booking.status} booking` };
  }

  const isLender = String(booking.lenderId) === String(userId);
  const isBorrower = String(booking.borrowerId) === String(userId);
  let allowed = false;
  if (rule.by === 'lender') allowed = isLender;
  else if (rule.by === 'borrower') allowed = isBorrower;
  else if (rule.by === 'either') allowed = isLender || isBorrower;

  if (!allowed) return { ok: false, code: 403, error: 'Forbidden' };
  return { ok: true, to: rule.to };
}

module.exports = { TRANSITIONS, TERMINAL, evaluate };
