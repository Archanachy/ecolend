// Khalti ePayment API v2 client — direct HTTPS calls via axios, no third-party
// SDK (smaller supply-chain surface; see the report's supply-chain section).
// The base URL is chosen only by KHALTI_ENV, never hardcoded at call sites.
// This module deliberately does no verification/business logic — it just talks
// to Khalti. All trust decisions live in the payment controller.
const axios = require('axios');

function baseUrl() {
  return process.env.KHALTI_ENV === 'production'
    ? 'https://khalti.com/api/v2'
    : 'https://dev.khalti.com/api/v2';
}

function headers() {
  return {
    Authorization: `key ${process.env.KHALTI_SECRET_KEY || ''}`,
    'Content-Type': 'application/json',
  };
}

// Server-to-server: start a payment. Returns { pidx, payment_url, expires_at, ... }.
async function initiate(payload) {
  const { data } = await axios.post(`${baseUrl()}/epayment/initiate/`, payload, {
    headers: headers(),
    timeout: 15000,
  });
  return data;
}

// Server-to-server: the authoritative status check. Returns
// { pidx, total_amount, status, transaction_id, fee, refunded }.
async function lookup(pidx) {
  const { data } = await axios.post(
    `${baseUrl()}/epayment/lookup/`,
    { pidx },
    { headers: headers(), timeout: 15000 }
  );
  return data;
}

module.exports = { initiate, lookup };
