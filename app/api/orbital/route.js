/**
 * FLOW — Updated Orbital Route (User Key Support)
 * =================================================
 * File: /app/api/orbital/route.js  (REPLACE existing file)
 *
 * Now accepts user-supplied Bitget API keys via request headers.
 * Falls back to server env keys if none provided.
 * Keys are NEVER logged or stored.
 */

import { NextResponse } from 'next/server';
import {
  calculateMultiTimeframeSignal,
} from '@/lib/orbitalEngine';

const BITGET_INTERVAL_MAP = {
  '1m': '1min', '5m': '5min', '15m': '15min',
  '30m': '30min', '1h': '1H', '4h': '4H', '1D': '1Day',
};

const YAHOO_INTERVAL_MAP = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '30m': '30m', '1h': '1h', '4h': '1h', '1D': '1d',
};

const YAHOO_RANGE_MAP = {
  '1m': '1d', '5m': '5d', '15m': '5d',
  '30m': '1mo', '1h': '1mo', '4h': '1mo', '1D': '6mo',
};

// ─────────────────────────────────────────────
// EXTRACT USER KEYS FROM REQUEST HEADERS
// ─────────────────────────────────────────────
function extractUserKeys(request) {
  const apiKey     = request.headers.get('x-bitget-api-key');
  const apiSecret  = request.headers.get('x-bitget-api-secret');
  const passphrase = request.headers.get('x-bitget-passphrase');

  // Use user keys if all three present, else fall back to env
  if (apiKey && apiSecret && passphrase) {
    return { apiKey, apiSecret, passphrase, source: 'user' };
  }

  return {
    apiKey:     process.env.BITGET_API_KEY     || '',
    apiSecret:  process.env.BITGET_API_SECRET  || '',
    passphrase: process.env.BITGET_PASSPHRASE  || '',
    source: 'server',
  };
}

// ─────────────────────────────────────────────
// FETCH BITGET (public endpoint — no auth needed for market data)
// ─────────────────────────────────────────────
async function fetchBitgetCandles(symbol, timeframe, limit = 100) {
  const interval = BITGET_INTERVAL_MAP[timeframe];
  if (!interval) throw new Error(`Unsupported timeframe: ${timeframe}`);

  // Bitget market data is public — no auth required
  const url = `https://api.bitget.com/api/v2/mix/market/candles?symbol=${symbol}&granularity=${interval}&limit=${limit}&productType=USDT-FUTURES`;

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Bitget error: ${res.status}`);

  const json = await res.json();
  if (json.code !== '00000') throw new Error(`Bitget: ${json.msg}`);

  const candles = json.data || [];
  return {
    prices:     candles.map(c => parseFloat(c[4])).reverse(),
    volumes:    candles.map(c => parseFloat(c[5])).reverse(),
    timestamps: candles.map(c => parseInt(c[0])).reverse(),
  };
}

// ─────────────────────────────────────────────
// FETCH YAHOO FINANCE
// ─────────────────────────────────────────────
async function fetchYahooCandles(symbol, timeframe) {
  const interval = YAHOO_INTERVAL_MAP[timeframe];
  const range    = YAHOO_RANGE_MAP[timeframe];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Yahoo error: ${res.status}`);

  const json   = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${symbol}`);

  const timestamps = result.timestamp || [];
  const closes     = result.indicators?.quote?.[0]?.close || [];
  const volumes    = result.indicators?.quote?.[0]?.volume || [];

  const validIdx = closes.map((c, i) => c !== null ? i : -1).filter(i => i >= 0);

  return {
    prices:     validIdx.map(i => closes[i]),
    volumes:    validIdx.map(i => volumes[i] || 0),
    timestamps: validIdx.map(i => timestamps[i] * 1000),
  };
}

function aggregate1hTo4h(prices, volumes) {
  const out = { prices: [], volumes: [] };
  for (let i = 0; i + 3 < prices.length; i += 4) {
    out.prices.push(prices.slice(i, i + 4).at(-1));
    out.volumes.push(volumes.slice(i, i + 4).reduce((a, b) => a + b, 0));
  }
  return out;
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
async function handler(request) {
  try {
    // Parse params
    let symbol, type, timeframes;

    if (request.method === 'POST') {
      const body = await request.json();
      symbol     = body.symbol;
      type       = body.type || 'crypto';
      timeframes = body.timeframes || '15m,1h,4h';
    } else {
      const { searchParams } = new URL(request.url);
      symbol     = searchParams.get('symbol');
      type       = searchParams.get('type') || 'crypto';
      timeframes = searchParams.get('timeframes') || '15m,1h,4h';
    }

    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }

    // Extract keys (user-supplied or server env)
    const keys = extractUserKeys(request);
    // Note: keys.source tells us which — but we never log the actual key values

    const tfList = timeframes.split(',').map(t => t.trim());
    const timeframeData = {};

    await Promise.all(
      tfList.map(async (tf) => {
        try {
          let data;

          if (type === 'crypto') {
            // Market data is public on Bitget — no auth needed
            data = await fetchBitgetCandles(symbol.toUpperCase(), tf);
          } else {
            if (tf === '4h') {
              const raw = await fetchYahooCandles(symbol.toUpperCase(), '1h');
              const agg = aggregate1hTo4h(raw.prices, raw.volumes);
              data = { prices: agg.prices, volumes: agg.volumes, timestamps: [] };
            } else {
              data = await fetchYahooCandles(symbol.toUpperCase(), tf);
            }
          }

          if (data.prices.length >= 10) {
            timeframeData[tf] = data;
          }
        } catch (err) {
          console.error(`${symbol} ${tf} fetch error:`, err.message);
        }
      })
    );

    if (Object.keys(timeframeData).length === 0) {
      return NextResponse.json(
        { error: 'Could not fetch data. Check symbol and try again.' },
        { status: 502 }
      );
    }

    const orbitalResult = calculateMultiTimeframeSignal(timeframeData);

    return NextResponse.json({
      success: true,
      symbol: symbol.toUpperCase(),
      type,
      keySource: keys.source,   // 'user' or 'server' — never the actual key
      processedTimeframes: Object.keys(timeframeData),
      orbital: orbitalResult,
    });

  } catch (err) {
    console.error('Orbital API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request)  { return handler(request); }
export async function POST(request) { return handler(request); }
