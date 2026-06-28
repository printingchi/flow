# 🪐 FLOW — Hackathon Submission

---

## Why We Built It

Markets move in cycles. Planets move in cycles. The math that governs orbital mechanics — Kepler's laws, gravitational pull, velocity and momentum — translates surprisingly well to price behavior. FLOW was built on one bold premise: **what if you modeled a trading asset the way NASA models a satellite?**

Beyond the conceptual frame, we built FLOW because most trading signal tools treat each timeframe and indicator in isolation. FLOW solves the multi-timeframe confluence problem by aggregating signals across seven timeframes and then resolving conflicts using actual quantum circuits — not quantum-inspired approximations, but real Qiskit circuits running on an Aer quantum simulator.

---

## The Strategy: How and Why It Works

FLOW's core logic is built on **three orbital mechanics principles**, each mapped to a real market concept:

**1. Periodicity — Kepler Cycles (FFT-based)**
Markets repeat. Kepler's laws describe how celestial bodies complete regular orbital cycles. FLOW uses a custom-built Fast Fourier Transform (FFT) to detect dominant price cycles in OHLCV data. It finds the dominant frequency, measures its phase, and computes a "cycle strength" score — essentially: *where in its current cycle is this asset, and how strong is that cycle?* A high periodicity score means the asset is at a significant cyclical turning point.

**2. Orbital Velocity — Momentum & Acceleration**
A satellite speeds up as it approaches a gravity source and slows near apogee. FLOW maps this to price velocity (rate of change) and acceleration (second derivative of price). A rising velocity with positive acceleration signals building momentum — the "satellite is accelerating toward perigee." This captures what traditional indicators like RSI or MACD approximate but through a more physics-grounded lens.

**3. Gravitational Pull — Support & Resistance Zones**
Gravitational pull in orbital mechanics describes attraction toward a mass center. In FLOW, "gravity" is the magnetic pull of historically significant price levels — dense clusters of support and resistance. If price is near a high-gravity zone and velocity is converging toward it, the signal strengthens. This is the structural equivalent: key liquidity levels acting as gravitational bodies.

---

## Signal Generation & Decision Logic

Each of the three orbital components generates a score between 0 and 1 per timeframe. These three scores are fed into a **3-qubit Qiskit quantum circuit** for blending:

- Each score is encoded as an RY rotation angle: `θ = score × π` (0 = bearish pole, π = bullish pole)
- Hadamard gates place each qubit in superposition — signals begin to interfere
- CNOT entanglement gates link the three qubits — when all three signals agree, interference is constructive (probability of |111⟩ or |000⟩ rises)
- RZ phase gates add directional bias per component
- Measurement collapses the superposition: `|111⟩` = strong BUY, `|000⟩` = strong SELL, mixed states = NEUTRAL

This quantum interference step is what makes FLOW's blending genuinely novel: **aligned signals reinforce each other; conflicting signals cancel out.** It's not a weighted average — it's interference physics applied to market data.

The multi-timeframe hierarchy then weights the quantum-blended result by timeframe significance:

| Timeframe | Weight |
|-----------|--------|
| 1m | 5% |
| 5m | 8% |
| 15m | 12% |
| 30m | 15% |
| 1h | 20% |
| 4h | 25% |
| 1D | 15% |

The 4h carries the most weight — structurally important, not noise-dominated. The final output is an `aggregateSignal` score and a `consensusSignal` (BUY / SELL / NEUTRAL) with a `confluenceLevel` (HIGH / MEDIUM / LOW).

---

## Data Sources & Signal Types

- **Crypto data:** Bitget API (live OHLCV for crypto pairs like BTCUSDT, ETHUSDT)
- **Equities:** Yahoo Finance (stocks like AAPL, TSLA)
- **Technical:** FFT cycle detection, velocity/acceleration derivatives, price structure clustering
- **Sentiment layer:** Planned for next version

---

## Risk Management

FLOW's current risk layer is signal-level, not position-level:
- The `confluenceLevel` flag (HIGH / MEDIUM / LOW) gates trade confidence
- Only HIGH confluence signals are acted on in paper trading
- Conflicting multi-timeframe signals produce NEUTRAL — no trade rather than a forced call
- Stop-loss and position sizing logic is planned for the next iteration

---

## Key Development Challenges

**Challenge 1 — FFT without external dependencies**
To keep the frontend lightweight, the FFT was implemented from scratch in pure JavaScript inside `orbitalEngine.js`. Getting the phase extraction and cycle-strength normalization right required several iterations of testing against known sine-wave inputs.

**Challenge 2 — Quantum circuit integration across stack**
Bridging a Python Qiskit backend with a Next.js frontend required a Flask microserver (`quantum_blend.py --serve`) running on port 5001, called by a Next.js API route. Handling latency, timeouts, and graceful fallback when the quantum server is unavailable was non-trivial.

**Challenge 3 — Multi-timeframe data alignment**
Different timeframes return different bar counts. Normalizing price arrays for FFT (padding to power-of-2 lengths) while preserving signal integrity across 1m and 1D required careful handling of edge cases with sparse data.

**Challenge 4 — Quantum output interpretation**
Raw qubit measurement probabilities needed to be mapped to directional signals in a stable, explainable way. The |111⟩ → bullish / |000⟩ → bearish / mixed → neutral mapping was the cleanest solution, but required tuning the threshold for what counts as "mixed."

---

## What's Complete vs. What's Missing

**Completed:**
- Full orbital engine (periodicity, velocity, gravitational) in JavaScript
- Real 3-qubit Qiskit quantum circuit blending
- Multi-timeframe weighted aggregation (7 timeframes)
- Live Bitget API + Yahoo Finance data integration
- Next.js full-stack frontend + API routes
- Backtest engine
- Paper trading log

**Missing / Next Steps:**
- Sentiment layer (social/news signal integration)
- Automated order execution via Bitget trading API
- Position sizing and dynamic stop-loss engine
- More asset classes (futures, prediction markets)
- On-chain data feeds (wallet flows, DEX volume)
- Live portfolio dashboard with P&L tracking

---

## Frameworks, Models & APIs Used

- **Next.js** — full-stack frontend + API routes
- **Qiskit + Qiskit-Aer** — real quantum circuit simulation
- **Flask** — Python microserver for quantum backend
- **Bitget API** — live crypto OHLCV data
- **Yahoo Finance** — equities data
- Custom FFT implementation (vanilla JS)

**Bitget Tools Used:** Bitget API (market data). Agent Hub, Playbook, MCP Server, and Skill Hub are planned for v2.

---

## Experience with Bitget AI Tools & Future of Agentic Trading

The Bitget API was reliable and well-documented for market data retrieval. The biggest unlock for future versions would be tighter integration with **Bitget's Agent Hub** — specifically, letting FLOW's quantum-blended signals feed directly into an execution agent that manages orders autonomously.

The future of agentic trading is multi-modal signal fusion with autonomous execution — exactly what FLOW's architecture is designed to scale toward. The quantum blending layer is genuinely differentiated: as quantum hardware matures, running this on real QPUs rather than simulators will make interference-based signal blending not just a novel framing but a computational edge.

The Hackathon surfaced one clear gap in the current AI tooling ecosystem: **explainability**. Traders need to trust their agents. FLOW's orbital + quantum framing is actually an advantage here — "your signal is weak because velocity and periodicity are out of phase" is more intuitive than "the model output a 0.43." Future Bitget AI tools should prioritize signal explainability as a first-class feature.

---

---

# 🪐 FLOW — Project Structure & Integration Guide

## Overview
FLOW is a Next.js full-stack orbital trading signal platform powered by:
- Classical orbital mechanics (Kepler cycles, velocity, gravitational pull)
- Quantum signal blending via Qiskit (real quantum circuits on Aer simulator)
- Multi-timeframe weighted hierarchy (1m → 1D)
- Real-time data from Bitget API (crypto) and Yahoo Finance (stocks)

---

## Project Structure

```
flow/
├── app/
│   ├── page.jsx                        ← Main dashboard (FlowDashboard.jsx)
│   ├── api/
│   │   ├── orbital/
│   │   │   └── route.js               ← Orbital signal API (Bitget + Yahoo)
│   │   └── quantum/
│   │       └── route.js               ← Quantum bridge API (quantum_route.js)
│
├── lib/
│   └── orbitalEngine.js               ← Core orbital calculation engine
│
├── quantum/
│   ├── quantum_blend.py               ← Qiskit quantum circuit engine
│   └── requirements.txt               ← Python dependencies
│
├── start.sh                           ← One-command startup script
├── .env.local                         ← Environment variables
└── package.json
```

---

## Setup Instructions

### 1. Clone / Create Next.js Project
```bash
npx create-next-app@latest flow --app --js --tailwind --no-src-dir
cd flow
```

### 2. Copy Files
```
FlowDashboard.jsx  → app/page.jsx
route.js           → app/api/orbital/route.js
quantum_route.js   → app/api/quantum/route.js
orbitalEngine.js   → lib/orbitalEngine.js
quantum_blend.py   → quantum/quantum_blend.py
requirements.txt   → quantum/requirements.txt
start.sh           → start.sh
```

### 3. Environment Variables
Create `.env.local` in root:
```env
QUANTUM_SERVER_URL=http://localhost:5001
BITGET_API_KEY=your_bitget_api_key
BITGET_API_SECRET=your_bitget_secret
BITGET_PASSPHRASE=your_bitget_passphrase
```

### 4. Install Dependencies
```bash
# Python quantum engine
pip install -r quantum/requirements.txt

# Next.js
npm install
```

### 5. Start Everything
```bash
chmod +x start.sh
./start.sh
```

Or manually in two terminals:
```bash
# Terminal 1 — Quantum engine
python3 quantum/quantum_blend.py --serve --port 5001

# Terminal 2 — Next.js
npm run dev
```

---

## API Reference

### GET /api/orbital
Fetch orbital signals from live market data.

```
GET /api/orbital?symbol=BTCUSDT&type=crypto&timeframes=1m,15m,1h,4h
GET /api/orbital?symbol=AAPL&type=stock&timeframes=15m,1h,1D
```

Response:
```json
{
  "success": true,
  "symbol": "BTCUSDT",
  "orbital": {
    "aggregateSignal": 0.7234,
    "consensusSignal": "BUY",
    "confluenceLevel": "HIGH",
    "recommendation": "🟢 BUY signal...",
    "timeframeSignals": { ... }
  }
}
```

---

### POST /api/quantum
Run quantum blending on orbital components.

```json
// Single blend
{
  "symbol": "BTCUSDT",
  "mode": "blend",
  "components": {
    "periodicity": 0.8,
    "velocity": 0.75,
    "gravitational": 0.7
  }
}

// Multi-timeframe aggregate
{
  "symbol": "BTCUSDT",
  "mode": "aggregate",
  "components": {
    "1h":  { "periodicity": 0.8, "velocity": 0.75, "gravitational": 0.70 },
    "4h":  { "periodicity": 0.85, "velocity": 0.80, "gravitational": 0.78 }
  }
}
```

Response:
```json
{
  "success": true,
  "quantum": {
    "aggregate_quantum_signal": 0.7812,
    "consensus_signal": "BUY",
    "quantum_confluence": 0.68,
    "confluence_level": "MEDIUM",
    "timeframe_results": { ... }
  }
}
```

---

### GET /api/quantum?periodicity=0.8&velocity=0.75&gravitational=0.7
Returns quantum circuit diagram as text.

---

## How the Quantum Circuit Works

```
q[0] (Periodicity)   ─ RY(θp) ─ H ─ ●─────X ─ RZ(θp/2) ─ H ─ M
q[1] (Velocity)      ─ RY(θv) ─ H ─ X─●───┤ ─ RZ(θv/2) ─ H ─ M
q[2] (Gravitational) ─ RY(θg) ─ H ─ ┤─X─● ┤ ─ RZ(θg/2) ─ H ─ M
```

1. **RY gates** encode scores as rotation angles [0 → π]
2. **Hadamard** puts each qubit in superposition
3. **CNOT** gates entangle signals — aligned signals reinforce
4. **RZ phase** adds directional bias per component
5. **Hadamard** collapses superposition — interference determines output
6. **Measurement** — |111⟩ = bullish, |000⟩ = bearish, mixed = neutral

---

## Timeframe Weight Hierarchy

| Timeframe | Weight | Influence |
|-----------|--------|-----------|
| 1m        | 5%     | Lowest    |
| 5m        | 8%     | Low       |
| 15m       | 12%    | Medium    |
| 30m       | 15%    | Medium    |
| 1h        | 20%    | High      |
| 4h        | 25%    | Highest   |
| 1D        | 15%    | High      |

---

## Hackathon Differentiators
1. **Real quantum circuits** — not just quantum-inspired math
2. **Orbital mechanics as trading indicators** — unique conceptual frame
3. **Dual quantum libraries** — Qiskit for circuits, quantum-circuit for lightweight blending
4. **Multi-asset** — crypto (Bitget) + stocks (Yahoo Finance)
5. **Full-stack** — Next.js frontend + Python quantum backend + real APIs
