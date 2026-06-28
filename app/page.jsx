import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────
// MOCK DATA (replace with real API calls)
// ─────────────────────────────────────────────
function generateMockOrbitalData(symbol) {
  const timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1D"];
  const signals = ["BUY", "SELL", "HOLD", "WATCH_LONG", "WATCH_SHORT"];
  const directions = ["bullish", "bearish", "neutral"];
  const momentums = ["accelerating", "decelerating", "steady"];

  const tfSignals = {};
  timeframes.forEach((tf) => {
    const signal = Math.random();
    const tradeSignal = signals[Math.floor(Math.random() * signals.length)];
    tfSignals[tf] = {
      timeframe: tf,
      signal: parseFloat(signal.toFixed(4)),
      tradeSignal,
      direction: directions[Math.floor(Math.random() * directions.length)],
      strength: signal > 0.7 ? "STRONG" : signal > 0.5 ? "MODERATE" : "WEAK",
      components: {
        periodicity: parseFloat((Math.random()).toFixed(4)),
        velocity: parseFloat((Math.random()).toFixed(4)),
        gravitational: parseFloat((Math.random()).toFixed(4)),
      },
      meta: {
        momentum: momentums[Math.floor(Math.random() * momentums.length)],
        nearestZone: Math.random() > 0.5 ? "resistance" : "support",
        proximityPct: (Math.random() * 100).toFixed(1),
      },
    };
  });

  const aggSignal = parseFloat((Math.random()).toFixed(4));
  const consensus = signals[Math.floor(Math.random() * signals.length)];
  const confluence = parseFloat((Math.random()).toFixed(4));

  return {
    symbol,
    orbital: {
      aggregateSignal: aggSignal,
      consensusSignal: consensus,
      confluenceScore: confluence,
      confluenceLevel: confluence > 0.7 ? "HIGH" : confluence > 0.5 ? "MEDIUM" : "LOW",
      recommendation:
        consensus === "BUY"
          ? `🟢 BUY signal — ${aggSignal > 0.7 ? "strong" : "moderate"} orbital momentum with ${confluence > 0.7 ? "high" : "moderate"} confluence.`
          : consensus === "SELL"
          ? `🔴 SELL signal — orbital pressure detected across timeframes.`
          : `⚪ HOLD — orbital signals mixed. Await clearer alignment.`,
      timeframeSignals: tfSignals,
    },
  };
}

// ─────────────────────────────────────────────
// ORBITAL RING COMPONENT
// ─────────────────────────────────────────────
function OrbitalRing({ score, label, color, size = 120, delay = 0 }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - score * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Orbit track */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1f2e" strokeWidth="8" />
        {/* Signal arc */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            filter: `drop-shadow(0 0 6px ${color}80)`,
          }}
        />
        {/* Center value */}
        <text
          x="50"
          y="46"
          textAnchor="middle"
          fill="#e8eaf6"
          fontSize="18"
          fontFamily="'Space Mono', monospace"
          fontWeight="700"
        >
          {(score * 100).toFixed(0)}
        </text>
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fill="#5c6bc0"
          fontSize="9"
          fontFamily="'Space Mono', monospace"
        >
          /100
        </text>
      </svg>
      <span style={{ color: "#9fa8da", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIGNAL BADGE
// ─────────────────────────────────────────────
function SignalBadge({ signal }) {
  const config = {
    BUY:         { bg: "#0d2b1a", border: "#00c853", text: "#00e676", label: "BUY" },
    SELL:        { bg: "#2b0d0d", border: "#d32f2f", text: "#ff5252", label: "SELL" },
    WATCH_LONG:  { bg: "#1a2010", border: "#827717", text: "#cddc39", label: "WATCH LONG" },
    WATCH_SHORT: { bg: "#1a1510", border: "#e65100", text: "#ff9800", label: "WATCH SHORT" },
    HOLD:        { bg: "#141420", border: "#37474f", text: "#78909c", label: "HOLD" },
  };
  const c = config[signal] || config.HOLD;

  return (
    <span style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      padding: "3px 10px",
      borderRadius: 4,
      fontSize: 11,
      fontFamily: "'Space Mono', monospace",
      fontWeight: 700,
      letterSpacing: 1,
    }}>
      {c.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// TIMEFRAME ROW
// ─────────────────────────────────────────────
function TimeframeRow({ tf, data }) {
  const barWidth = (data.signal * 100).toFixed(1);
  const barColor =
    data.tradeSignal === "BUY" ? "#00c853" :
    data.tradeSignal === "SELL" ? "#f44336" :
    data.tradeSignal === "WATCH_LONG" ? "#cddc39" :
    data.tradeSignal === "WATCH_SHORT" ? "#ff9800" : "#455a64";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "52px 1fr 90px 80px 70px",
      alignItems: "center",
      gap: 12,
      padding: "10px 16px",
      borderBottom: "1px solid #0d1117",
      transition: "background 0.2s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#0d1117"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Timeframe label */}
      <span style={{ color: "#7986cb", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700 }}>
        {tf}
      </span>

      {/* Signal bar */}
      <div style={{ position: "relative", height: 6, background: "#1a1f2e", borderRadius: 3 }}>
        <div style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: `${barWidth}%`,
          background: barColor,
          borderRadius: 3,
          boxShadow: `0 0 6px ${barColor}60`,
          transition: "width 1s ease",
        }} />
      </div>

      {/* Signal value */}
      <span style={{ color: "#c5cae9", fontFamily: "'Space Mono', monospace", fontSize: 11, textAlign: "right" }}>
        {(data.signal * 100).toFixed(1)}%
      </span>

      {/* Trade signal */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <SignalBadge signal={data.tradeSignal} />
      </div>

      {/* Direction */}
      <span style={{
        color: data.direction === "bullish" ? "#00c853" : data.direction === "bearish" ? "#f44336" : "#546e7a",
        fontFamily: "'Space Mono', monospace",
        fontSize: 10,
        textAlign: "right",
      }}>
        {data.direction === "bullish" ? "↑" : data.direction === "bearish" ? "↓" : "→"} {data.direction}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// PLANET ANIMATION
// ─────────────────────────────────────────────
function PlanetaryOrbit({ aggSignal }) {
  return (
    <div style={{ position: "relative", width: 180, height: 180, flexShrink: 0 }}>
      {/* Outer orbit */}
      <div style={{
        position: "absolute", inset: 0,
        border: "1px solid #1a2040",
        borderRadius: "50%",
        animation: "spin 20s linear infinite",
      }}>
        <div style={{
          position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
          width: 10, height: 10,
          background: "#7c4dff",
          borderRadius: "50%",
          boxShadow: "0 0 10px #7c4dff",
        }} />
      </div>

      {/* Inner orbit */}
      <div style={{
        position: "absolute", inset: 28,
        border: "1px solid #1a3040",
        borderRadius: "50%",
        animation: "spin 12s linear infinite reverse",
      }}>
        <div style={{
          position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
          width: 8, height: 8,
          background: "#00bcd4",
          borderRadius: "50%",
          boxShadow: "0 0 8px #00bcd4",
        }} />
      </div>

      {/* Core */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 60, height: 60,
          background: `radial-gradient(circle, #1a237e, #0d1117)`,
          borderRadius: "50%",
          border: `2px solid ${aggSignal > 0.6 ? "#7c4dff" : "#1a2040"}`,
          boxShadow: aggSignal > 0.6 ? "0 0 20px #7c4dff40" : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column",
        }}>
          <span style={{ color: "#e8eaf6", fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700 }}>
            {(aggSignal * 100).toFixed(0)}
          </span>
          <span style={{ color: "#5c6bc0", fontFamily: "'Space Mono', monospace", fontSize: 8 }}>
            ORBITAL
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
export default function FlowDashboard() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [assetType, setAssetType] = useState("crypto");
  const [inputValue, setInputValue] = useState("BTCUSDT");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1D"];

  async function fetchSignal(sym, type) {
    setLoading(true);
    try {
      // In production, replace with real API call:
      // const res = await fetch(`/api/orbital?symbol=${sym}&type=${type}&timeframes=1m,5m,15m,30m,1h,4h,1D`);
      // const json = await res.json();
      // setData(json);

      // Mock data for demo
      await new Promise(r => setTimeout(r, 800));
      setData(generateMockOrbitalData(sym));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSignal(symbol, assetType);
    intervalRef.current = setInterval(() => fetchSignal(symbol, assetType), 30000);
    return () => clearInterval(intervalRef.current);
  }, [symbol, assetType]);

  function handleSearch() {
    const sym = inputValue.trim().toUpperCase();
    if (!sym) return;
    setSymbol(sym);
    clearInterval(intervalRef.current);
  }

  const orbital = data?.orbital;
  const tfSignals = orbital?.timeframeSignals || {};

  const consensusColor =
    orbital?.consensusSignal === "BUY" ? "#00c853" :
    orbital?.consensusSignal === "SELL" ? "#f44336" :
    orbital?.consensusSignal?.includes("WATCH") ? "#ff9800" : "#546e7a";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070a13",
      color: "#e8eaf6",
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #1a237e; border-radius: 2px; }
      `}</style>

      {/* HEADER */}
      <div style={{
        borderBottom: "1px solid #0d1225",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#070a13",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32,
            background: "radial-gradient(circle at 35% 35%, #7c4dff, #1a237e)",
            borderRadius: "50%",
            boxShadow: "0 0 12px #7c4dff60",
          }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, letterSpacing: 3, color: "#e8eaf6" }}>
            FLOW
          </span>
          <span style={{ color: "#3d4f8a", fontSize: 12, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
            ORBITAL TRADING ENGINE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {lastUpdated && (
            <span style={{ color: "#37474f", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
              Updated {lastUpdated}
            </span>
          )}
          {loading && (
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#7c4dff",
              animation: "pulse 1s infinite",
            }} />
          )}
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* SEARCH BAR */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          {/* Asset type toggle */}
          <div style={{ display: "flex", background: "#0d1117", borderRadius: 6, border: "1px solid #1a1f2e", overflow: "hidden" }}>
            {["crypto", "stock"].map(t => (
              <button
                key={t}
                onClick={() => setAssetType(t)}
                style={{
                  padding: "8px 16px",
                  background: assetType === t ? "#1a237e" : "transparent",
                  color: assetType === t ? "#e8eaf6" : "#455a64",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Symbol input */}
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={assetType === "crypto" ? "BTCUSDT, ETHUSDT..." : "AAPL, TSLA, NVDA..."}
            style={{
              flex: 1,
              background: "#0d1117",
              border: "1px solid #1a1f2e",
              borderRadius: 6,
              padding: "8px 16px",
              color: "#e8eaf6",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              outline: "none",
            }}
          />

          <button
            onClick={handleSearch}
            style={{
              background: "#1a237e",
              border: "none",
              borderRadius: 6,
              padding: "8px 20px",
              color: "#e8eaf6",
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 1,
              transition: "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#283593"}
            onMouseLeave={e => e.currentTarget.style.background = "#1a237e"}
          >
            SCAN
          </button>

          <button
            onClick={() => fetchSignal(symbol, assetType)}
            style={{
              background: "transparent",
              border: "1px solid #1a1f2e",
              borderRadius: 6,
              padding: "8px 16px",
              color: "#455a64",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#3d5afe"; e.currentTarget.style.color = "#7986cb"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a1f2e"; e.currentTarget.style.color = "#455a64"; }}
          >
            ↻ REFRESH
          </button>
        </div>

        {orbital && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>

            {/* TOP SECTION: Orbital visualization + consensus */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 24,
              alignItems: "center",
              background: "#0a0e1a",
              border: "1px solid #0d1225",
              borderRadius: 12,
              padding: 28,
              marginBottom: 20,
            }}>
              {/* Planetary orbit animation */}
              <PlanetaryOrbit aggSignal={orbital.aggregateSignal} />

              {/* Consensus block */}
              <div style={{ padding: "0 16px" }}>
                <div style={{ color: "#3d4f8a", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 8 }}>
                  ORBITAL CONSENSUS · {data?.symbol}
                </div>
                <div style={{
                  fontSize: 40,
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  color: consensusColor,
                  lineHeight: 1,
                  marginBottom: 12,
                  textShadow: `0 0 20px ${consensusColor}40`,
                }}>
                  {orbital.consensusSignal?.replace("_", " ")}
                </div>
                <div style={{ color: "#78909c", fontSize: 13, lineHeight: 1.6, maxWidth: 480 }}>
                  {orbital.recommendation?.replace(/^[🟢🔴🟡⚪]\s*/, "")}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>
                      CONFLUENCE
                    </div>
                    <div style={{ color: orbital.confluenceLevel === "HIGH" ? "#00c853" : orbital.confluenceLevel === "MEDIUM" ? "#ff9800" : "#f44336", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14 }}>
                      {orbital.confluenceLevel} · {(orbital.confluenceScore * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>
                      AGGREGATE SIGNAL
                    </div>
                    <div style={{ color: "#7986cb", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14 }}>
                      {(orbital.aggregateSignal * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Three orbital components */}
              <div style={{ display: "flex", gap: 20 }}>
                {(() => {
                  // Average components across timeframes
                  const tfs = Object.values(tfSignals).filter(s => !s.error);
                  const avg = (key) => tfs.reduce((s, t) => s + t.components[key], 0) / (tfs.length || 1);
                  return (
                    <>
                      <OrbitalRing score={avg("periodicity")} label="Periodicity" color="#7c4dff" />
                      <OrbitalRing score={avg("velocity")} label="Velocity" color="#00bcd4" />
                      <OrbitalRing score={avg("gravitational")} label="Gravity" color="#ff6d00" />
                    </>
                  );
                })()}
              </div>
            </div>

            {/* TIMEFRAME TABLE */}
            <div style={{
              background: "#0a0e1a",
              border: "1px solid #0d1225",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 20,
            }}>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr 90px 80px 70px",
                gap: 12,
                padding: "10px 16px",
                borderBottom: "1px solid #0d1225",
                background: "#070a13",
              }}>
                {["TF", "ORBITAL SIGNAL", "STRENGTH", "SIGNAL", "DIRECTION"].map(h => (
                  <span key={h} style={{ color: "#2d3a6a", fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 700, letterSpacing: 1 }}>
                    {h}
                  </span>
                ))}
              </div>

              {TIMEFRAMES.map(tf => tfSignals[tf] ? (
                <TimeframeRow key={tf} tf={tf} data={tfSignals[tf]} />
              ) : (
                <div key={tf} style={{ padding: "10px 16px", color: "#2d3a6a", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                  {tf} — no data
                </div>
              ))}
            </div>

            {/* COMPONENT BREAKDOWN per timeframe */}
            <div style={{
              background: "#0a0e1a",
              border: "1px solid #0d1225",
              borderRadius: 12,
              padding: 20,
            }}>
              <div style={{ color: "#3d4f8a", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 16 }}>
                ORBITAL COMPONENTS PER TIMEFRAME
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {TIMEFRAMES.filter(tf => tfSignals[tf]).map(tf => {
                  const s = tfSignals[tf];
                  return (
                    <div key={tf} style={{
                      background: "#070a13",
                      border: "1px solid #0d1225",
                      borderRadius: 8,
                      padding: "12px 16px",
                      minWidth: 140,
                      flex: "1 1 140px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ color: "#7986cb", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700 }}>{tf}</span>
                        <SignalBadge signal={s.tradeSignal} />
                      </div>
                      {[
                        { label: "Periodicity", key: "periodicity", color: "#7c4dff" },
                        { label: "Velocity", key: "velocity", color: "#00bcd4" },
                        { label: "Gravity", key: "gravitational", color: "#ff6d00" },
                      ].map(({ label, key, color }) => (
                        <div key={key} style={{ marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ color: "#455a64", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>{label}</span>
                            <span style={{ color, fontSize: 10, fontFamily: "'Space Mono', monospace" }}>
                              {(s.components[key] * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div style={{ height: 3, background: "#1a1f2e", borderRadius: 2 }}>
                            <div style={{
                              height: "100%",
                              width: `${s.components[key] * 100}%`,
                              background: color,
                              borderRadius: 2,
                              transition: "width 1s ease",
                            }} />
                          </div>
                        </div>
                      ))}
                      <div style={{ marginTop: 8, color: "#37474f", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>
                        {s.meta?.momentum} · near {s.meta?.nearestZone}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {!orbital && !loading && (
          <div style={{ textAlign: "center", color: "#2d3a6a", fontFamily: "'Space Mono', monospace", padding: 80 }}>
            Enter a symbol and press SCAN to begin orbital analysis.
          </div>
        )}

        {loading && !orbital && (
          <div style={{ textAlign: "center", color: "#3d4f8a", fontFamily: "'Space Mono', monospace", padding: 80, animation: "pulse 1.5s infinite" }}>
            Calculating orbital signals...
          </div>
        )}
      </div>
    </div>
  );
}
