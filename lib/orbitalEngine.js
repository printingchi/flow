/**
 * FLOW - Orbital Trading Signal Engine
 * =====================================
 * Blends three orbital mechanics principles into unified trading signals:
 *   1. Periodicity (Kepler's cycles via FFT)
 *   2. Velocity (Orbital momentum & acceleration)
 *   3. Gravitational Pull (Support & resistance zones)
 *
 * Multi-timeframe support with weighted hierarchy:
 *   1m < 5m < 15m < 30m < 1h < 4h < 1D
 */

// ─────────────────────────────────────────────
// TIMEFRAME WEIGHTS (higher = more influential)
// ─────────────────────────────────────────────
const TIMEFRAME_WEIGHTS = {
  '1m':  0.05,
  '5m':  0.08,
  '15m': 0.12,
  '30m': 0.15,
  '1h':  0.20,
  '4h':  0.25,
  '1D':  0.15,
};

// ─────────────────────────────────────────────
// FFT IMPLEMENTATION (no external dependency)
// ─────────────────────────────────────────────
function fft(re, im) {
  const n = re.length;
  if (n <= 1) return;

  const halfN = n / 2;
  const evenRe = new Float64Array(halfN);
  const evenIm = new Float64Array(halfN);
  const oddRe  = new Float64Array(halfN);
  const oddIm  = new Float64Array(halfN);

  for (let i = 0; i < halfN; i++) {
    evenRe[i] = re[2 * i];
    evenIm[i] = im[2 * i];
    oddRe[i]  = re[2 * i + 1];
    oddIm[i]  = im[2 * i + 1];
  }

  fft(evenRe, evenIm);
  fft(oddRe, oddIm);

  for (let k = 0; k < halfN; k++) {
    const angle = (-2 * Math.PI * k) / n;
    const cosA  = Math.cos(angle);
    const sinA  = Math.sin(angle);

    const tRe = cosA * oddRe[k] - sinA * oddIm[k];
    const tIm = sinA * oddRe[k] + cosA * oddIm[k];

    re[k]        = evenRe[k] + tRe;
    im[k]        = evenIm[k] + tIm;
    re[k + halfN] = evenRe[k] - tRe;
    im[k + halfN] = evenIm[k] - tIm;
  }
}

// Pad to next power of 2 for FFT
function padToPow2(data) {
  let n = 1;
  while (n < data.length) n <<= 1;
  const padded = new Float64Array(n);
  for (let i = 0; i < data.length; i++) padded[i] = data[i];
  return padded;
}

// ─────────────────────────────────────────────
// COMPONENT 1: PERIODICITY (Kepler Cycles)
// ─────────────────────────────────────────────
/**
 * Uses FFT to detect dominant price cycles.
 * Returns a score [0, 1] indicating cyclical strength.
 * High score = price is at a strong cyclical turning point.
 */
function calculatePeriodicity(priceData) {
  if (priceData.length < 4) return 0;

  const padded = padToPow2(priceData);
  const n = padded.length;

  const re = new Float64Array(padded);
  const im = new Float64Array(n); // zeros

  fft(re, im);

  // Find dominant frequency magnitude
  let maxMagnitude = 0;
  let totalMagnitude = 0;
  let dominantFreq = 1;

  for (let i = 1; i < n / 2; i++) {
    const magnitude = Math.sqrt(re[i] ** 2 + im[i] ** 2);
    totalMagnitude += magnitude;
    if (magnitude > maxMagnitude) {
      maxMagnitude = magnitude;
      dominantFreq = i;
    }
  }

  // Phase of dominant frequency (where we are in the cycle)
  const phase = Math.atan2(im[dominantFreq], re[dominantFreq]);
  const normalizedPhase = (phase + Math.PI) / (2 * Math.PI); // [0, 1]

  // Cycle strength = dominant magnitude as fraction of total energy
  const cycleStrength = totalMagnitude > 0 ? maxMagnitude / totalMagnitude : 0;

  // Combined: strong signal at cycle peaks/troughs
  const periodicityScore = Math.min(cycleStrength * (1 + Math.abs(Math.sin(phase * Math.PI))), 1.0);

  return periodicityScore;
}

// ─────────────────────────────────────────────
// COMPONENT 2: ORBITAL VELOCITY
// ─────────────────────────────────────────────
/**
 * Models price momentum as orbital velocity.
 * Velocity = rate of change.
 * Acceleration = change in velocity (second derivative).
 * Returns score [0, 1].
 */
function calculateVelocity(priceData) {
  if (priceData.length < 3) return 0;

  // First derivative (returns)
  const returns = [];
  for (let i = 1; i < priceData.length; i++) {
    returns.push((priceData[i] - priceData[i - 1]) / priceData[i - 1]);
  }

  // Second derivative (acceleration)
  const acceleration = [];
  for (let i = 1; i < returns.length; i++) {
    acceleration.push(returns[i] - returns[i - 1]);
  }

  // Orbital velocity = average absolute return (speed)
  const avgVelocity = returns.reduce((s, r) => s + Math.abs(r), 0) / returns.length;

  // Recent velocity vs historical (momentum building or fading)
  const recentWindow = Math.max(3, Math.floor(returns.length * 0.2));
  const recentVelocity = returns.slice(-recentWindow).reduce((s, r) => s + Math.abs(r), 0) / recentWindow;
  const velocityRatio = avgVelocity > 0 ? recentVelocity / avgVelocity : 0;

  // Acceleration signal (is momentum increasing?)
  const avgAcceleration = acceleration.reduce((s, a) => s + Math.abs(a), 0) / acceleration.length;
  const recentAcceleration = acceleration.slice(-recentWindow).reduce((s, a) => s + Math.abs(a), 0) / Math.max(recentWindow - 1, 1);
  const accelerationRatio = avgAcceleration > 0 ? recentAcceleration / avgAcceleration : 0;

  // Directional bias (+1 = bullish, -1 = bearish)
  const direction = returns.slice(-5).reduce((s, r) => s + Math.sign(r), 0) / 5;

  const rawScore = (velocityRatio * 0.5 + accelerationRatio * 0.3 + Math.abs(direction) * 0.2);
  const velocityScore = Math.min(rawScore, 1.0);

  return {
    score: velocityScore,
    direction: direction > 0.2 ? 'bullish' : direction < -0.2 ? 'bearish' : 'neutral',
    momentum: velocityRatio > 1.2 ? 'accelerating' : velocityRatio < 0.8 ? 'decelerating' : 'steady',
  };
}

// ─────────────────────────────────────────────
// COMPONENT 3: GRAVITATIONAL PULL
// ─────────────────────────────────────────────
/**
 * Models support/resistance zones as gravitational fields.
 * Price near a strong zone = high gravitational score.
 * Uses volume-weighted pivot zones if volume data available.
 */
function calculateGravitational(priceData, volumeData = null) {
  if (priceData.length < 5) return 0;

  const current = priceData[priceData.length - 1];
  const highest = Math.max(...priceData);
  const lowest  = Math.min(...priceData);
  const range   = highest - lowest;

  if (range === 0) return 0;

  // Identify swing highs and lows (pivot points)
  const pivots = [];
  const lookback = Math.max(2, Math.floor(priceData.length * 0.1));

  for (let i = lookback; i < priceData.length - lookback; i++) {
    const window = priceData.slice(i - lookback, i + lookback + 1);
    const localMax = Math.max(...window);
    const localMin = Math.min(...window);

    if (priceData[i] === localMax) {
      pivots.push({ price: priceData[i], type: 'resistance', strength: 1 });
    }
    if (priceData[i] === localMin) {
      pivots.push({ price: priceData[i], type: 'support', strength: 1 });
    }
  }

  // Add volume weighting if available
  if (volumeData && volumeData.length === priceData.length) {
    const avgVolume = volumeData.reduce((s, v) => s + v, 0) / volumeData.length;
    pivots.forEach(pivot => {
      const idx = priceData.indexOf(pivot.price);
      if (idx >= 0) {
        pivot.strength = volumeData[idx] / avgVolume;
      }
    });
  }

  // Calculate gravitational pull from each pivot zone
  let totalGravity = 0;
  let weightedGravity = 0;

  pivots.forEach(pivot => {
    const distance = Math.abs(current - pivot.price) / range;
    // Gravity = inverse square law (closer = stronger pull)
    const gravity = pivot.strength / (distance ** 2 + 0.01);
    totalGravity += gravity;
    weightedGravity += gravity;
  });

  // Normalize: proximity to nearest strong zone
  const nearestPivot = pivots.reduce((nearest, p) => {
    const dist = Math.abs(current - p.price);
    return dist < Math.abs(current - nearest.price) ? p : nearest;
  }, { price: highest, type: 'resistance', strength: 0 });

  const proximityToZone = 1 - (Math.abs(current - nearestPivot.price) / range);

  const gravitationalScore = Math.min(proximityToZone * 0.6 + Math.min(totalGravity / 100, 0.4), 1.0);

  return {
    score: gravitationalScore,
    nearestZone: nearestPivot.type,
    proximityPct: (proximityToZone * 100).toFixed(1),
    pivotCount: pivots.length,
  };
}

// ─────────────────────────────────────────────
// QUANTUM-INSPIRED SIGNAL BLENDING
// ─────────────────────────────────────────────
/**
 * Simulates quantum superposition of orbital states.
 * Each component is treated as a quantum state with amplitude.
 * Interference patterns determine final signal strength.
 */
function quantumBlend(periodicityScore, velocityResult, gravitationalResult) {
  const vScore = typeof velocityResult === 'object' ? velocityResult.score : velocityResult;
  const gScore = typeof gravitationalResult === 'object' ? gravitationalResult.score : gravitationalResult;

  // Quantum amplitudes (square root of probabilities)
  const ampP = Math.sqrt(periodicityScore);
  const ampV = Math.sqrt(vScore);
  const ampG = Math.sqrt(gScore);

  // Interference: constructive when signals align
  const interference = (ampP * ampV + ampV * ampG + ampG * ampP) / 3;

  // Final blended score (weighted + interference bonus)
  const baseBlend = periodicityScore * 0.30 + vScore * 0.40 + gScore * 0.30;
  const quantumBoost = interference * 0.15;

  return Math.min(baseBlend + quantumBoost, 1.0);
}

// ─────────────────────────────────────────────
// MAIN ENGINE: SINGLE TIMEFRAME
// ─────────────────────────────────────────────
/**
 * Calculates the full orbital signal for one timeframe.
 * @param {number[]} priceData - Array of closing prices
 * @param {string}   timeframe - '1m', '5m', '15m', '30m', '1h', '4h', '1D'
 * @param {number[]} volumeData - Optional volume array (same length as priceData)
 * @returns {OrbitalSignal}
 */
function calculateOrbitalSignal(priceData, timeframe, volumeData = null) {
  if (!priceData || priceData.length < 10) {
    return { error: 'Insufficient data. Need at least 10 candles.', timeframe };
  }

  const periodicityScore  = calculatePeriodicity(priceData);
  const velocityResult    = calculateVelocity(priceData);
  const gravitationalResult = calculateGravitational(priceData, volumeData);

  const vScore = typeof velocityResult === 'object' ? velocityResult.score : velocityResult;
  const gScore = typeof gravitationalResult === 'object' ? gravitationalResult.score : gravitationalResult;

  const blendedSignal = quantumBlend(periodicityScore, vScore, gScore);
  const weight = TIMEFRAME_WEIGHTS[timeframe] || 0.10;

  // Signal direction
  const direction = typeof velocityResult === 'object' ? velocityResult.direction : 'neutral';
  const nearestZone = typeof gravitationalResult === 'object' ? gravitationalResult.nearestZone : 'unknown';

  // Trade signal classification
  let tradeSignal = 'HOLD';
  if (blendedSignal > 0.65 && direction === 'bullish' && nearestZone === 'support') {
    tradeSignal = 'BUY';
  } else if (blendedSignal > 0.65 && direction === 'bearish' && nearestZone === 'resistance') {
    tradeSignal = 'SELL';
  } else if (blendedSignal > 0.55) {
    tradeSignal = direction === 'bullish' ? 'WATCH_LONG' : direction === 'bearish' ? 'WATCH_SHORT' : 'HOLD';
  }

  return {
    timeframe,
    weight,
    signal: parseFloat(blendedSignal.toFixed(4)),
    weightedSignal: parseFloat((blendedSignal * weight).toFixed(4)),
    tradeSignal,
    direction,
    strength: blendedSignal > 0.70 ? 'STRONG' : blendedSignal > 0.50 ? 'MODERATE' : 'WEAK',
    components: {
      periodicity: parseFloat(periodicityScore.toFixed(4)),
      velocity: parseFloat(vScore.toFixed(4)),
      gravitational: parseFloat(gScore.toFixed(4)),
    },
    meta: {
      momentum: typeof velocityResult === 'object' ? velocityResult.momentum : 'unknown',
      nearestZone,
      proximityPct: typeof gravitationalResult === 'object' ? gravitationalResult.proximityPct : null,
      pivotCount: typeof gravitationalResult === 'object' ? gravitationalResult.pivotCount : 0,
    },
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
// MULTI-TIMEFRAME AGGREGATOR
// ─────────────────────────────────────────────
/**
 * Aggregates orbital signals across all timeframes.
 * Higher timeframes carry more weight.
 *
 * @param {Object} timeframeData - { '1m': { prices: [], volumes: [] }, '1h': { ... }, ... }
 * @returns {AggregatedOrbitalSignal}
 */
function calculateMultiTimeframeSignal(timeframeData) {
  const signals = {};
  let totalWeightedSignal = 0;
  let totalWeight = 0;
  const tradeVotes = { BUY: 0, SELL: 0, HOLD: 0, WATCH_LONG: 0, WATCH_SHORT: 0 };

  for (const [tf, data] of Object.entries(timeframeData)) {
    if (!TIMEFRAME_WEIGHTS[tf]) {
      console.warn(`Unknown timeframe: ${tf}. Skipping.`);
      continue;
    }

    const signal = calculateOrbitalSignal(data.prices, tf, data.volumes || null);
    signals[tf] = signal;

    if (!signal.error) {
      totalWeightedSignal += signal.weightedSignal;
      totalWeight += signal.weight;

      // Weighted voting
      const vote = signal.tradeSignal;
      tradeVotes[vote] = (tradeVotes[vote] || 0) + signal.weight;
    }
  }

  // Normalize aggregate signal
  const aggregateSignal = totalWeight > 0 ? totalWeightedSignal / totalWeight : 0;

  // Determine consensus trade signal
  const consensusSignal = Object.entries(tradeVotes).reduce((a, b) => b[1] > a[1] ? b : a)[0];

  // Confluence score: how much timeframes agree
  const maxVoteWeight = Math.max(...Object.values(tradeVotes));
  const confluenceScore = totalWeight > 0 ? maxVoteWeight / totalWeight : 0;

  return {
    aggregateSignal: parseFloat(aggregateSignal.toFixed(4)),
    consensusSignal,
    confluenceScore: parseFloat(confluenceScore.toFixed(4)),
    confluenceLevel: confluenceScore > 0.7 ? 'HIGH' : confluenceScore > 0.5 ? 'MEDIUM' : 'LOW',
    tradeVotes,
    timeframeSignals: signals,
    recommendation: buildRecommendation(consensusSignal, aggregateSignal, confluenceScore),
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
// RECOMMENDATION BUILDER
// ─────────────────────────────────────────────
function buildRecommendation(signal, strength, confluence) {
  const strengthLabel = strength > 0.70 ? 'strong' : strength > 0.50 ? 'moderate' : 'weak';
  const confluenceLabel = confluence > 0.7 ? 'high confluence' : confluence > 0.5 ? 'moderate confluence' : 'low confluence';

  const messages = {
    BUY:         `🟢 BUY signal — ${strengthLabel} orbital momentum with ${confluenceLabel} across timeframes.`,
    SELL:        `🔴 SELL signal — ${strengthLabel} orbital pressure with ${confluenceLabel} across timeframes.`,
    WATCH_LONG:  `🟡 WATCH LONG — Orbital conditions building. Wait for confirmation on higher timeframes.`,
    WATCH_SHORT: `🟡 WATCH SHORT — Orbital conditions weakening. Monitor for reversal confirmation.`,
    HOLD:        `⚪ HOLD — Orbital signals mixed or insufficient confluence. Await clearer alignment.`,
  };

  return messages[signal] || '⚪ No clear orbital signal detected.';
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  calculateOrbitalSignal,
  calculateMultiTimeframeSignal,
  calculatePeriodicity,
  calculateVelocity,
  calculateGravitational,
  quantumBlend,
  TIMEFRAME_WEIGHTS,
};


// ─────────────────────────────────────────────
// QUICK TEST (run directly: node orbitalEngine.js)
// ─────────────────────────────────────────────
if (require.main === module) {
  // Simulate BTC price data across two timeframes
  const mockPrices1h = Array.from({ length: 50 }, (_, i) =>
    60000 + Math.sin(i * 0.3) * 2000 + Math.random() * 500
  );

  const mockPrices15m = Array.from({ length: 50 }, (_, i) =>
    60000 + Math.sin(i * 0.8) * 800 + Math.random() * 200
  );

  const result = calculateMultiTimeframeSignal({
    '15m': { prices: mockPrices15m },
    '1h':  { prices: mockPrices1h },
  });

  console.log('\n🪐 FLOW Orbital Engine — Test Output\n');
  console.log('Aggregate Signal:  ', result.aggregateSignal);
  console.log('Consensus:         ', result.consensusSignal);
  console.log('Confluence:        ', result.confluenceLevel, `(${result.confluenceScore})`);
  console.log('Recommendation:    ', result.recommendation);
  console.log('\nPer-Timeframe:');
  for (const [tf, s] of Object.entries(result.timeframeSignals)) {
    if (!s.error) {
      console.log(`  ${tf.padEnd(5)} | Signal: ${s.signal} | ${s.tradeSignal.padEnd(12)} | Direction: ${s.direction}`);
    }
  }
}
