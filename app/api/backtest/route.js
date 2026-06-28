/**
 * FLOW — Backtest API Route
 * ==========================
 * File: /app/api/backtest/route.js
 *
 * Bridges Next.js with the Python backtest engine.
 * POST /api/backtest
 * Body: { symbol, type, config }
 */

import { NextResponse } from 'next/server';

const BACKTEST_SERVER_URL = process.env.BACKTEST_SERVER_URL || 'http://localhost:5002';

export async function POST(request) {
  try {
    const body = await request.json();

    // Health check
    try {
      const health = await fetch(`${BACKTEST_SERVER_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!health.ok) throw new Error('offline');
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Backtest server offline. Run: python backtest/backtest_engine.py --serve',
      }, { status: 503 });
    }

    const res = await fetch(`${BACKTEST_SERVER_URL}/backtest/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000), // 60s for backtest
    });

    const data = await res.json();
    return NextResponse.json(data);

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
