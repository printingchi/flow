/**
 * FLOW — Backtest Dashboard
 * ==========================
 * File: /app/backtest/page.jsx
 *
 * Visualizes:
 *   1. P&L Equity Curve + Win Rate + Sharpe Ratio
 *   2. Full Trade Log with filtering
 *   3. Drawdown Analysis chart
 *   4. Orbital Signal Heatmap vs Price
 */

"use client";
import { useState, useRef } from "react";

// ─────────────────────────────────────────────
// MOCK REPORT (used when server is offline)
// ─────────────────────────────────────────────
function generateMockReport(symbol) {
  const trades = Array.from({ length: 40 }, (_, i) => {
    const isWin = Math.random() > 0.42;
    const pnl = isWin ? Math.random() * 200 + 20 : -(Math.random() * 100 + 10);
    const type = Math.random() > 0.5 ? "long" : "short";
    const entryDate = new Date(2024, 0, i * 9 + 1);
    const exitDate = new Date(entryDate.getTime() + Math.random() * 86400000 * 3);
    return {
      type,
      entry_time: entryDate.toISOString(),
      exit_time: exitDate.toISOString(),
      entry_price: 60000 + Math.random() * 5000,
      exit_price: 60000 + Math.random() * 5000,
      pnl: parseFloat(pnl.toFixed(2)),
      pnl_pct: parseFloat((pnl / 1000 * 100).toFixed(2)),
      exit_reason: ["take_profit", "stop_loss", "signal_exit"][Math.floor(Math.random() * 3)],
      orbital_signal: parseFloat((0.5 + Math.random() * 0.5).toFixed(3)),
    };
  });

  let equity = 10000;
  const equityCurve = trades.map((t, i) => {
    equity += t.pnl;
    return { timestamp: t.entry_time, equity: parseFloat(equity.toFixed(2)), price: 60000 + i * 100 };
  });

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const heatmap = {};
  days.forEach(d => {
    heatmap[d] = {};
    for (let h = 0; h < 24; h++) heatmap[d][h] = parseFloat((Math.random() * 0.8 + 0.1).toFixed(2));
  });

  return {
    symbol,
    performance: {
      final_capital: parseFloat(equity.toFixed(2)),
      total_pnl: parseFloat(trades.reduce((s, t) => s + t.pnl, 0).toFixed(2)),
      total_return_pct: parseFloat(((equity - 10000) / 10000 * 100).toFixed(2)),
      total_trades: trades.length,
      winning_trades: wins.length,
      losing_trades: losses.length,
      win_rate: parseFloat((wins.length / trades.length * 100).toFixed(1)),
      avg_win: parseFloat((wins.reduce((s, t) => s + t.pnl, 0) / wins.length).toFixed(2)),
      avg_loss: parseFloat((losses.reduce((s, t) => s + t.pnl, 0) / losses.length).toFixed(2)),
      profit_factor: parseFloat(Math.abs(wins.reduce((s,t) => s+t.pnl,0) / losses.reduce((s,t) => s+t.pnl,1)).toFixed(2)),
      sharpe_ratio: parseFloat((Math.random() * 2 + 0.5).toFixed(3)),
      max_drawdown_pct: parseFloat(-(Math.random() * 15 + 2).toFixed(2)),
      best_trade: Math.max(...trades.map(t => t.pnl)),
      worst_trade: Math.min(...trades.map(t => t.pnl)),
    },
    trade_log: trades,
    equity_curve: equityCurve,
    signal_heatmap: heatmap,
    exit_reasons: { take_profit: 18, stop_loss: 14, signal_exit: 8 },
  };
}

// ─────────────────────────────────────────────
// MINI SVG CHART
// ─────────────────────────────────────────────
function MiniLineChart({ data, color = "#7c4dff", height = 120, label }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => d.equity || d.value || d);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 600, h = height;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${h} ` + points + ` ${w},${h}`;
  const isPositive = values[values.length - 1] >= values[0];
  const lineColor = isPositive ? "#00c853" : "#f44336";

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {label && <div style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 8 }}>{label}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad_${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad_${label})`} />
        <polyline points={points} fill="none" stroke={lineColor} strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 4px ${lineColor}60)` }} />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// DRAWDOWN CHART
// ─────────────────────────────────────────────
function DrawdownChart({ equityCurve }) {
  if (!equityCurve || equityCurve.length < 2) return null;
  const equities = equityCurve.map(e => e.equity);
  const drawdowns = [];
  let peak = equities[0];
  equities.forEach(e => {
    if (e > peak) peak = e;
    drawdowns.push(((e - peak) / peak) * 100);
  });

  const min = Math.min(...drawdowns);
  const w = 600, h = 80;
  const points = drawdowns.map((d, i) => {
    const x = (i / (drawdowns.length - 1)) * w;
    const y = (d / min) * (h - 10) + 5;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      <div style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 8 }}>
        DRAWDOWN %
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 80 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="ddgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f44336" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f44336" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={`0,5 ${points} ${w},5`} fill="url(#ddgrad)" />
        <polyline points={points} fill="none" stroke="#f44336" strokeWidth="1.5" />
        <line x1="0" y1="5" x2={w} y2="5" stroke="#1a1f2e" strokeWidth="1" strokeDasharray="4,4" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#455a64", fontSize: 10, fontFamily: "'Space Mono', monospace", marginTop: 4 }}>
        <span>Start</span>
        <span>Max DD: {min.toFixed(2)}%</span>
        <span>End</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIGNAL HEATMAP
// ─────────────────────────────────────────────
function SignalHeatmap({ data }) {
  if (!data || Object.keys(data).length === 0) return null;
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  function getColor(val) {
    if (val === undefined || val === null) return "#0d1117";
    if (val > 0.75) return "#1b5e20";
    if (val > 0.60) return "#2e7d32";
    if (val > 0.50) return "#388e3c";
    if (val > 0.40) return "#1a237e";
    if (val > 0.30) return "#283593";
    return "#1a1f2e";
  }

  return (
    <div>
      <div style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 12 }}>
        ORBITAL SIGNAL STRENGTH — DAY × HOUR
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}>
          <thead>
            <tr>
              <td style={{ width: 80 }} />
              {hours.map(h => (
                <td key={h} style={{ textAlign: "center", color: "#2d3a6a", fontSize: 9, fontFamily: "'Space Mono', monospace", padding: "0 1px" }}>
                  {h === 0 ? "12a" : h === 12 ? "12p" : h > 12 ? `${h-12}p` : `${h}a`}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day}>
                <td style={{ color: "#455a64", fontSize: 10, fontFamily: "'Space Mono', monospace", paddingRight: 8, whiteSpace: "nowrap" }}>
                  {day.slice(0, 3)}
                </td>
                {hours.map(h => {
                  const val = data[day]?.[h];
                  return (
                    <td key={h} title={`${day} ${h}:00 — Signal: ${val?.toFixed(2) || 'N/A'}`}
                      style={{
                        width: 24, height: 20,
                        background: getColor(val),
                        border: "1px solid #070a13",
                        borderRadius: 2,
                        cursor: "pointer",
                        transition: "opacity 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
          <span style={{ color: "#37474f", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>Low</span>
          {["#1a1f2e","#283593","#1a237e","#388e3c","#2e7d32","#1b5e20"].map(c => (
            <div key={c} style={{ width: 16, height: 12, background: c, borderRadius: 2 }} />
          ))}
          <span style={{ color: "#37474f", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>High</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TRADE LOG TABLE
// ─────────────────────────────────────────────
function TradeLog({ trades }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("entry_time");

  const filtered = trades
    .filter(t => filter === "all" || (filter === "wins" ? t.pnl > 0 : t.pnl <= 0))
    .sort((a, b) => sortBy === "pnl" ? b.pnl - a.pnl : new Date(b.entry_time) - new Date(a.entry_time));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}>
          TRADE LOG ({filtered.length} trades)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "wins", "losses"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "4px 10px",
              background: filter === f ? "#1a237e" : "transparent",
              border: "1px solid #1a1f2e",
              borderRadius: 4,
              color: filter === f ? "#e8eaf6" : "#455a64",
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              cursor: "pointer",
              textTransform: "uppercase",
            }}>
              {f}
            </button>
          ))}
          <select onChange={e => setSortBy(e.target.value)} style={{
            background: "#0d1117", border: "1px solid #1a1f2e",
            borderRadius: 4, color: "#7986cb",
            fontFamily: "'Space Mono', monospace", fontSize: 10,
            padding: "4px 8px", cursor: "pointer",
          }}>
            <option value="entry_time">Sort: Time</option>
            <option value="pnl">Sort: P&L</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #0d1225" }}>
              {["Type","Entry","Exit","Entry $","Exit $","P&L","P&L %","Signal","Reason"].map(h => (
                <th key={h} style={{ color: "#2d3a6a", fontSize: 10, fontFamily: "'Space Mono', monospace", padding: "8px 10px", textAlign: "left", fontWeight: 700 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((t, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #0a0e1a" }}
                onMouseEnter={e => e.currentTarget.style.background = "#0d1117"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "8px 10px", color: t.type === "long" ? "#00c853" : "#f44336", fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700 }}>
                  {t.type === "long" ? "↑ L" : "↓ S"}
                </td>
                <td style={{ padding: "8px 10px", color: "#546e7a", fontFamily: "'Space Mono', monospace", fontSize: 10 }}>
                  {new Date(t.entry_time).toLocaleDateString()}
                </td>
                <td style={{ padding: "8px 10px", color: "#546e7a", fontFamily: "'Space Mono', monospace", fontSize: 10 }}>
                  {new Date(t.exit_time).toLocaleDateString()}
                </td>
                <td style={{ padding: "8px 10px", color: "#78909c", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                  ${t.entry_price?.toFixed(0)}
                </td>
                <td style={{ padding: "8px 10px", color: "#78909c", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                  ${t.exit_price?.toFixed(0)}
                </td>
                <td style={{ padding: "8px 10px", color: t.pnl > 0 ? "#00c853" : "#f44336", fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700 }}>
                  {t.pnl > 0 ? "+" : ""}${t.pnl?.toFixed(2)}
                </td>
                <td style={{ padding: "8px 10px", color: t.pnl_pct > 0 ? "#00c853" : "#f44336", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                  {t.pnl_pct > 0 ? "+" : ""}{t.pnl_pct?.toFixed(2)}%
                </td>
                <td style={{ padding: "8px 10px", color: "#7986cb", fontFamily: "'Space Mono', monospace", fontSize: 10 }}>
                  {(t.orbital_signal * 100)?.toFixed(0)}%
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{
                    color: t.exit_reason === "take_profit" ? "#00c853" : t.exit_reason === "stop_loss" ? "#f44336" : "#ff9800",
                    fontFamily: "'Space Mono', monospace", fontSize: 9,
                    background: t.exit_reason === "take_profit" ? "#0d2b1a" : t.exit_reason === "stop_loss" ? "#2b0d0d" : "#1a1500",
                    padding: "2px 6px", borderRadius: 3,
                  }}>
                    {t.exit_reason?.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
function StatCard({ label, value, sub, color = "#7986cb", highlight = false }) {
  return (
    <div style={{
      background: "#0a0e1a",
      border: `1px solid ${highlight ? color + "40" : "#0d1225"}`,
      borderRadius: 8,
      padding: "16px 20px",
      boxShadow: highlight ? `0 0 16px ${color}15` : "none",
    }}>
      <div style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ color: "#37474f", fontSize: 10, fontFamily: "'Space Mono', monospace", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN BACKTEST DASHBOARD
// ─────────────────────────────────────────────
export default function BacktestDashboard() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [assetType, setAssetType] = useState("crypto");
  const [inputValue, setInputValue] = useState("BTCUSDT");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [config, setConfig] = useState({
    initial_capital: 10000,
    position_size_pct: 0.10,
    stop_loss_pct: 0.02,
    take_profit_pct: 0.04,
    lookback: 50,
    signal_threshold: 0.65,
    commission_pct: 0.001,
  });

  async function runBacktest() {
    setLoading(true);
    try {
      // Production: real API call
      // const res = await fetch('/api/backtest', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ symbol, type: assetType, config }),
      // });
      // const data = await res.json();
      // if (data.success) setReport(data.report);

      // Mock for demo
      await new Promise(r => setTimeout(r, 1500));
      setReport(generateMockReport(symbol));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const p = report?.performance;
  const tabs = ["overview", "trades", "drawdown", "heatmap"];

  return (
    <div style={{ minHeight: "100vh", background: "#070a13", color: "#e8eaf6", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #0d1225", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#070a13", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: "radial-gradient(circle at 35% 35%, #7c4dff, #1a237e)", borderRadius: "50%", boxShadow: "0 0 12px #7c4dff60" }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, letterSpacing: 3 }}>FLOW</span>
          <span style={{ color: "#3d4f8a", fontSize: 12, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>BACKTEST ENGINE</span>
        </div>
        <a href="/" style={{ color: "#455a64", fontSize: 11, fontFamily: "'Space Mono', monospace", textDecoration: "none" }}>← Live Dashboard</a>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* CONTROLS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ display: "flex", background: "#0d1117", borderRadius: 6, border: "1px solid #1a1f2e", overflow: "hidden" }}>
              {["crypto", "stock"].map(t => (
                <button key={t} onClick={() => setAssetType(t)} style={{
                  padding: "8px 16px", background: assetType === t ? "#1a237e" : "transparent",
                  color: assetType === t ? "#e8eaf6" : "#455a64", border: "none", cursor: "pointer",
                  fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                }}>
                  {t}
                </button>
              ))}
            </div>
            <input value={inputValue} onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (setSymbol(inputValue.trim().toUpperCase()), runBacktest())}
              placeholder={assetType === "crypto" ? "BTCUSDT, ETHUSDT..." : "AAPL, TSLA..."}
              style={{ flex: 1, background: "#0d1117", border: "1px solid #1a1f2e", borderRadius: 6, padding: "8px 16px", color: "#e8eaf6", fontFamily: "'Space Mono', monospace", fontSize: 13, outline: "none" }}
            />
            <button onClick={() => { setSymbol(inputValue.trim().toUpperCase()); runBacktest(); }}
              disabled={loading}
              style={{ background: loading ? "#0d1117" : "#1a237e", border: "none", borderRadius: 6, padding: "8px 24px", color: loading ? "#37474f" : "#e8eaf6", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1 }}>
              {loading ? "RUNNING..." : "▶ RUN BACKTEST"}
            </button>
          </div>

          {/* Config quick-set */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[
              { key: "stop_loss_pct", label: "SL%", format: v => `${(v*100).toFixed(0)}%`, options: [0.01, 0.02, 0.03, 0.05] },
              { key: "take_profit_pct", label: "TP%", format: v => `${(v*100).toFixed(0)}%`, options: [0.02, 0.04, 0.06, 0.10] },
              { key: "signal_threshold", label: "Threshold", format: v => v.toFixed(2), options: [0.55, 0.60, 0.65, 0.70] },
            ].map(({ key, label, format, options }) => (
              <div key={key}>
                <div style={{ color: "#2d3a6a", fontSize: 9, fontFamily: "'Space Mono', monospace", marginBottom: 3 }}>{label}</div>
                <select value={config[key]} onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) }))}
                  style={{ background: "#0d1117", border: "1px solid #1a1f2e", borderRadius: 4, color: "#7986cb", fontFamily: "'Space Mono', monospace", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
                  {options.map(o => <option key={o} value={o}>{format(o)}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: "#3d4f8a", fontFamily: "'Space Mono', monospace", padding: 80, animation: "pulse 1.5s infinite" }}>
            Running orbital backtest simulation...
          </div>
        )}

        {report && !loading && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>

            {/* STAT CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard label="TOTAL RETURN" value={`${p.total_return_pct > 0 ? "+" : ""}${p.total_return_pct}%`}
                color={p.total_return_pct > 0 ? "#00c853" : "#f44336"} sub={`$${p.total_pnl.toFixed(2)} P&L`} highlight />
              <StatCard label="WIN RATE" value={`${p.win_rate}%`}
                color={p.win_rate > 50 ? "#00c853" : "#ff9800"} sub={`${p.winning_trades}W / ${p.losing_trades}L`} />
              <StatCard label="SHARPE RATIO" value={p.sharpe_ratio}
                color={p.sharpe_ratio > 1.5 ? "#00c853" : p.sharpe_ratio > 0.5 ? "#ff9800" : "#f44336"} sub="Annualized" />
              <StatCard label="MAX DRAWDOWN" value={`${p.max_drawdown_pct}%`}
                color={Math.abs(p.max_drawdown_pct) < 10 ? "#00c853" : Math.abs(p.max_drawdown_pct) < 20 ? "#ff9800" : "#f44336"} sub="Peak to trough" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard label="TOTAL TRADES" value={p.total_trades} color="#7986cb" />
              <StatCard label="PROFIT FACTOR" value={p.profit_factor} color={p.profit_factor > 1.5 ? "#00c853" : "#ff9800"} sub="Gross profit / loss" />
              <StatCard label="AVG WIN" value={`$${p.avg_win}`} color="#00c853" />
              <StatCard label="AVG LOSS" value={`$${Math.abs(p.avg_loss)}`} color="#f44336" />
            </div>

            {/* TABS */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #0d1225" }}>
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid #7c4dff" : "2px solid transparent",
                  color: activeTab === tab ? "#e8eaf6" : "#37474f",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                  cursor: "pointer", transition: "all 0.2s",
                }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div style={{ background: "#0a0e1a", border: "1px solid #0d1225", borderRadius: 12, padding: 24 }}>

              {activeTab === "overview" && (
                <div>
                  <MiniLineChart data={report.equity_curve} label="EQUITY CURVE" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
                    <div style={{ background: "#070a13", borderRadius: 8, padding: 16 }}>
                      <div style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 12 }}>EXIT REASONS</div>
                      {Object.entries(report.exit_reasons).map(([reason, count]) => (
                        <div key={reason} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ color: reason === "take_profit" ? "#00c853" : reason === "stop_loss" ? "#f44336" : "#ff9800", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                            {reason.replace("_", " ")}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 80, height: 4, background: "#1a1f2e", borderRadius: 2 }}>
                              <div style={{ height: "100%", width: `${(count / p.total_trades) * 100}%`, background: reason === "take_profit" ? "#00c853" : reason === "stop_loss" ? "#f44336" : "#ff9800", borderRadius: 2 }} />
                            </div>
                            <span style={{ color: "#546e7a", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "#070a13", borderRadius: 8, padding: 16 }}>
                      <div style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 12 }}>BEST / WORST</div>
                      <div style={{ color: "#00c853", fontFamily: "'Space Mono', monospace", fontSize: 14, marginBottom: 8 }}>Best: +${p.best_trade?.toFixed(2)}</div>
                      <div style={{ color: "#f44336", fontFamily: "'Space Mono', monospace", fontSize: 14, marginBottom: 8 }}>Worst: -${Math.abs(p.worst_trade)?.toFixed(2)}</div>
                      <div style={{ color: "#7986cb", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>Final: ${p.final_capital?.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "trades" && <TradeLog trades={report.trade_log} />}

              {activeTab === "drawdown" && <DrawdownChart equityCurve={report.equity_curve} />}

              {activeTab === "heatmap" && <SignalHeatmap data={report.signal_heatmap} />}
            </div>
          </div>
        )}

        {!report && !loading && (
          <div style={{ textAlign: "center", color: "#2d3a6a", fontFamily: "'Space Mono', monospace", padding: 80 }}>
            Configure parameters above and run a backtest to see results.
          </div>
        )}
      </div>
    </div>
  );
}
