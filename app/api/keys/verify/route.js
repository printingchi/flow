/**
 * FLOW — API Key Verification Route
 * ===================================
 * File: /app/api/keys/verify/route.js
 *
 * Verifies user-supplied Bitget API keys by making a lightweight
 * authenticated request. Keys are NEVER stored — used once and discarded.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Generate Bitget API signature.
 * timestamp + method + requestPath + body
 */
function generateSignature(timestamp, method, path, body, secret) {
  const prehash = `${timestamp}${method}${path}${body}`;
  return crypto
    .createHmac('sha256', secret)
    .update(prehash)
    .digest('base64');
}

export async function POST(request) {
  try {
    const { apiKey, apiSecret, passphrase } = await request.json();

    if (!apiKey || !apiSecret || !passphrase) {
      return NextResponse.json(
        { success: false, error: 'All three fields are required.' },
        { status: 400 }
      );
    }

    // Basic format checks
    if (apiKey.length < 10 || apiSecret.length < 10 || passphrase.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Keys appear too short. Please double-check and paste the full values.' },
        { status: 400 }
      );
    }

    // Make a lightweight authenticated call to Bitget
    // GET /api/v2/account/info — read-only, no funds access
    const timestamp  = Date.now().toString();
    const method     = 'GET';
    const path       = '/api/v2/user/verify-login';
    const body       = '';

    const signature = generateSignature(timestamp, method, path, body, apiSecret);

    const res = await fetch(`https://api.bitget.com${path}`, {
      method,
      headers: {
        'ACCESS-KEY':        apiKey,
        'ACCESS-SIGN':       signature,
        'ACCESS-TIMESTAMP':  timestamp,
        'ACCESS-PASSPHRASE': passphrase,
        'Content-Type':      'application/json',
        'locale':            'en-US',
      },
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();

    // Bitget returns code '00000' for success
    if (data.code === '00000') {
      return NextResponse.json({
        success: true,
        message: 'Keys verified successfully.',
        // Never echo back the keys
      });
    }

    // Handle specific Bitget error codes
    const errorMessages = {
      '40001': 'Invalid API key. Check you copied the full key.',
      '40002': 'Invalid signature. Your API Secret may be incorrect.',
      '40003': 'Invalid passphrase.',
      '40006': 'API key does not exist.',
      '40009': 'API key has expired.',
      '40011': 'IP not whitelisted for this key. Remove IP restrictions in Bitget.',
      '40300': 'Insufficient permissions. Ensure the key has Read access.',
    };

    const errMsg = errorMessages[data.code] || data.msg || 'Verification failed. Check your keys and try again.';

    return NextResponse.json(
      { success: false, error: errMsg, code: data.code },
      { status: 401 }
    );

  } catch (err) {
    if (err.name === 'TimeoutError') {
      return NextResponse.json(
        { success: false, error: 'Bitget did not respond in time. Try again.' },
        { status: 504 }
      );
    }
    console.error('Key verification error:', err);
    return NextResponse.json(
      { success: false, error: 'Verification request failed. Check your connection.' },
      { status: 500 }
    );
  }
}
