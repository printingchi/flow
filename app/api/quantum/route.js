/**
 * FLOW — Quantum Bridge API Route
 * =================================
 * File: /app/api/quantum/route.js
 *
 * Bridges the Next.js orbital engine with the Python Qiskit server.
 * Fetches orbital component scores, sends them to the quantum engine,
 * and returns the quantum-enhanced signal.
 *
 * Usage:
 *   POST /api/quantum
 *   Body: {
 *     symbol: 'BTCUSDT',
 *     type: 'crypto',
 *     timeframes: ['15m', '1h', '4h'],
 *     components: {                          // optional: skip if fetching fresh
 *       '1h': { periodicity, velocity, gravitational },
 *       '4h': { periodicity, velocity, gravitational },
 *     }
 *   }
 */

import { NextResponse } from 'next/server';

const QUANTUM_SERVER_URL = process.env.QUANTUM_SERVER_URL || 'http://localhost:5001';

// ─────────────────────────────────────────────
// CALL QUANTUM SERVER
// ─────────────────────────────────────────────
async function callQuantumServer(endpoint, body) {
  const res = await fetch(`${QUANTUM_SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000), // 15s timeout for quantum computation
  });

  if (!res.ok) {
    throw new Error(`Quantum server error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────
// CHECK QUANTUM SERVER HEALTH
// ─────────────────────────────────────────────
async function checkQuantumHealth() {
  try {
    const res = await fetch(`${QUANTUM_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { symbol, type = 'crypto', timeframes, components, mode = 'aggregate' } = body;

    // Check quantum server is alive
    const quantumOnline = await checkQuantumHealth();
    if (!quantumOnline) {
      return NextResponse.json({
        success: false,
        error: 'Quantum server offline. Start with: python quantum_blend.py --serve',
        fallback: true,
      }, { status: 503 });
    }

    // ── MODE 1: Single blend (one set of components) ──
    if (mode === 'blend' && components && !Array.isArray(components)) {
      const result = await callQuantumServer('/quantum/blend', {
        periodicity:   components.periodicity   ?? 0.5,
        velocity:      components.velocity      ?? 0.5,
        gravitational: components.gravitational ?? 0.5,
        shots: body.shots ?? 1024,
      });

      return NextResponse.json({
        success: true,
        symbol,
        mode: 'blend',
        quantum: result.result,
      });
    }

    // ── MODE 2: Multi-timeframe aggregate (default) ──
    if (!components || typeof components !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'components object required. Format: { "1h": { periodicity, velocity, gravitational }, ... }',
      }, { status: 400 });
    }

    // Filter to requested timeframes if specified
    const filteredComponents = timeframes
      ? Object.fromEntries(
          Object.entries(components).filter(([tf]) => timeframes.includes(tf))
        )
      : components;

    if (Object.keys(filteredComponents).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid timeframe components provided.',
      }, { status: 400 });
    }

    const result = await callQuantumServer('/quantum/aggregate', {
      timeframes: filteredComponents,
    });

    return NextResponse.json({
      success: true,
      symbol,
      type,
      mode: 'aggregate',
      quantum: result.result,
    });

  } catch (err) {
    // Handle timeout specifically
    if (err.name === 'TimeoutError') {
      return NextResponse.json({
        success: false,
        error: 'Quantum computation timed out. Try reducing timeframes or shots.',
      }, { status: 504 });
    }

    console.error('Quantum bridge error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
    }, { status: 500 });
  }
}

// ── Circuit diagram endpoint (GET) ──
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const p = parseFloat(searchParams.get('periodicity') || '0.5');
    const v = parseFloat(searchParams.get('velocity')    || '0.5');
    const g = parseFloat(searchParams.get('gravitational') || '0.5');

    const quantumOnline = await checkQuantumHealth();
    if (!quantumOnline) {
      return NextResponse.json({ success: false, error: 'Quantum server offline.' }, { status: 503 });
    }

    const result = await callQuantumServer('/quantum/circuit', {
      periodicity: p, velocity: v, gravitational: g,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
