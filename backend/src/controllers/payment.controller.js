// Payment controller — the project's core payment-security control.
//
// Non-negotiable rules (spec 05 §Payment verification integrity):
//  1. Never trust the return_url callback query params — always call Khalti's
//     Lookup API server-side before changing any booking state.
//  2. Verify BOTH status ("Completed") AND amount (total_amount must equal the
//     exact paisa amount stored at initiation). A mismatch is treated as
//     suspected tampering, not a partial success.
//  3. Prevent pidx reuse — one pidx per booking (unique index), and re-initiation
//     is refused while a pidx is still awaiting verification.
//  4. Guard double-processing — approved->paid is an atomic, condition-guarded
//     update that only succeeds while the booking is still 'approved'.
//  5. Fail closed — anything other than a verified Completed+amount-match leaves
//     the booking 'approved' so the borrower can safely retry.
const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const SecurityAlert = require('../models/securityAlert.model');
const khalti = require('../services/khalti.service');
const { computeIntegrityHash } = require('../utils/bookingIntegrity');
const { notifyUser, bookingUrl } = require('../services/notification.service');
const { logger } = require('../middleware/logger');

function backendUrl() {
  return process.env.BACKEND_URL || 'http://localhost:5000';
}
function frontendUrl() {
  return process.env.APP_URL || 'http://localhost:5173';
}

// Clears the pending payment reference so the borrower can retry with a fresh
// pidx. Only ever called for a terminal non-success outcome (never for
// 'Pending', where the payment may still complete).
async function clearPendingPayment(booking) {
  booking.khaltiPidx = undefined;
  booking.khaltiAmountPaisa = undefined;
  booking.khaltiPaymentUrl = undefined;
  await booking.save();
}

// Applies approved -> paid atomically, INCLUDING the recomputed integrity hash
// in the same update, so the row is never persisted in a status/hash-
// inconsistent state and two concurrent verifications can't both transition
// (double-processing guard). Returns true only if THIS call applied it.
async function applyVerifiedPayment(booking, lookup) {
  const now = new Date();
  const paidHash = computeIntegrityHash({
    _id: booking._id,
    status: 'paid',
    feeTotal: booking.feeTotal,
    depositAmount: booking.depositAmount,
    createdAt: booking.createdAt,
  });
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'approved' },
    {
      $set: {
        status: 'paid',
        khaltiTransactionId: lookup.transaction_id,
        paymentVerifiedAt: now,
        integrityHash: paidHash,
      },
      $push: { statusHistory: { status: 'paid', at: now, byUserId: booking.borrowerId } },
    }
  );
  // Whether we applied it or another concurrent request already did, the
  // booking is now paid — report success without double-applying.
  logger.info(updated ? 'payment.verified' : 'payment.already_applied', {
    bookingId: String(booking._id),
  });
  // Notify the lender only when this request actually applied the transition.
  if (updated) {
    await notifyUser(
      booking.lenderId,
      'Payment received — please arrange handover',
      `Payment for your booking is confirmed. Please arrange handover.\n\n${bookingUrl(booking._id)}`,
      { link: `/bookings/${booking._id}`, type: 'payment' }
    );
  }
  return Boolean(updated);
}

// POST /bookings/:id/pay — borrower starts payment for an approved booking.
async function initiatePayment(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (String(booking.borrowerId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (booking.status !== 'approved') {
      return res.status(409).json({ error: 'Booking is not awaiting payment' });
    }
    // A pidx from an earlier attempt is still on the booking. Never mint a
    // second one blindly (that is the pidx-reuse hole) — ask Khalti what
    // actually happened to it. Without this the borrower is stuck forever if
    // they closed the Khalti tab instead of returning through return_url.
    if (booking.khaltiPidx && !booking.paymentVerifiedAt) {
      const prior = await khalti.lookup(booking.khaltiPidx);
      const amountMatches = Number(prior.total_amount) === Number(booking.khaltiAmountPaisa);

      if (prior.status === 'Completed' && amountMatches) {
        // They did pay; only the redirect back to us was lost. Settle it now.
        await applyVerifiedPayment(booking, prior);
        return res.status(409).json({ error: 'This booking is already paid' });
      }
      if (prior.status === 'Completed') {
        // Paid the wrong amount — same suspected-tampering path as the callback.
        await SecurityAlert.create({
          type: 'integrity_mismatch',
          userId: booking.borrowerId,
          detail: `Payment amount mismatch on booking ${booking._id}: expected ${booking.khaltiAmountPaisa}, got ${prior.total_amount}`,
        }).catch(() => {});
        logger.warn('payment.amount_mismatch', { bookingId: String(booking._id) });
        await clearPendingPayment(booking);
        return res.status(409).json({ error: 'That payment could not be verified' });
      }
      if (prior.status === 'Initiated' || prior.status === 'Pending') {
        // Still live — resume the same attempt rather than opening a second one.
        return res.json({ payment_url: booking.khaltiPaymentUrl });
      }
      // Expired / User canceled / Failed / Refunded — release it and fall
      // through to start a genuinely fresh attempt.
      await clearPendingPayment(booking);
    }

    const amountPaisa = Math.round((booking.feeTotal + booking.depositAmount) * 100);
    const borrower = await User.findById(booking.borrowerId).select('name email');

    const initiateRes = await khalti.initiate({
      return_url: `${backendUrl()}/api/bookings/${booking._id}/payment/callback`,
      website_url: frontendUrl(),
      amount: amountPaisa,
      purchase_order_id: String(booking._id),
      purchase_order_name: `EcoLend booking ${booking._id}`,
      customer_info: { name: borrower?.name, email: borrower?.email },
    });

    // Persist pidx + the exact amount BEFORE handing the payment_url to the client.
    booking.khaltiPidx = initiateRes.pidx;
    booking.khaltiAmountPaisa = amountPaisa;
    booking.khaltiPaymentUrl = initiateRes.payment_url;
    await booking.save();

    return res.json({ payment_url: initiateRes.payment_url });
  } catch (err) {
    return next(err);
  }
}

// GET /bookings/:id/payment/callback — the Khalti return_url target.
//
// This route is intentionally NOT session-authenticated: Khalti redirects the
// browser cross-site, so the SameSite=Strict session cookie is not sent. That
// is safe here because the authority is the server-side Lookup call, not the
// session — the endpoint only ever marks a booking paid when Khalti itself
// confirms a Completed payment of the exact amount, and is idempotent and
// fail-closed. The query params are ignored entirely.
async function paymentCallback(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const redirect = (result) =>
      res.redirect(`${frontendUrl()}/bookings/${booking._id}/payment/callback?result=${result}`);

    if (!booking.khaltiPidx) return redirect('failed');

    // Authoritative check — never trust the callback query string.
    const lookup = await khalti.lookup(booking.khaltiPidx);

    const amountMatches = Number(lookup.total_amount) === Number(booking.khaltiAmountPaisa);
    const isCompleted = lookup.status === 'Completed';

    // Completed but wrong amount => suspected tampering. Fail closed; allow retry.
    if (isCompleted && !amountMatches) {
      await SecurityAlert.create({
        type: 'integrity_mismatch',
        userId: booking.borrowerId,
        detail: `Payment amount mismatch on booking ${booking._id}: expected ${booking.khaltiAmountPaisa}, got ${lookup.total_amount}`,
      }).catch(() => {});
      logger.warn('payment.amount_mismatch', { bookingId: String(booking._id) });
      await clearPendingPayment(booking);
      return redirect('failed');
    }

    if (isCompleted && amountMatches) {
      await applyVerifiedPayment(booking, lookup);
      return redirect('success');
    }

    // Still in progress — keep the pidx so the payment can complete.
    if (lookup.status === 'Pending' || lookup.status === 'Initiated') {
      logger.info('payment.pending', { bookingId: String(booking._id) });
      return redirect('pending');
    }

    // User canceled / Expired / Failed / Refunded — fail closed and let the
    // borrower retry with a fresh pidx.
    logger.info('payment.not_completed', { bookingId: String(booking._id), status: lookup.status });
    await clearPendingPayment(booking);
    return redirect('failed');
  } catch (err) {
    return next(err);
  }
}

module.exports = { initiatePayment, paymentCallback };
