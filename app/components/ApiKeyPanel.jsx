/**
 * FLOW — API Key Settings Panel
 * ==============================
 * File: /app/components/ApiKeyPanel.jsx
 *
 * Lets users connect their own Bitget API keys.
 * Keys are passed per-request in headers — never stored on our servers.
 */

"use client";
import { useState } from "react";

const SHIELD_ICON = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const EYE_ICON = ({ open }) => open ? (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
  </svg>
);

const CHECK_ICON = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c853" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const LOCK_ICON = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

export default function ApiKeyPanel({ onKeysChange, connected }) {
  const [open, setOpen]           = useState(false);
  const [apiKey, setApiKey]       = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showKey, setShowKey]     = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [readOnly, setReadOnly]   = useState(true);
  const [status, setStatus]       = useState(null); // 'connecting' | 'connected' | 'error'
  const [errorMsg, setErrorMsg]   = useState("");

  async function handleConnect() {
    if (!apiKey.trim() || !apiSecret.trim() || !passphrase.trim()) {
      setStatus("error");
      setErrorMsg("All three fields are required.");
      return;
    }
    setStatus("connecting");
    setErrorMsg("");

    try {
      // Test the keys by calling our backend with them
      const res = await fetch("/api/keys/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          passphrase: passphrase.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("connected");
        onKeysChange?.({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), passphrase: passphrase.trim() });
        setTimeout(() => setOpen(false), 1200);
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Could not verify keys. Check they are correct and have read-only permissions.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Connection failed. Check your internet and try again.");
    }
  }

  function handleDisconnect() {
    setApiKey("");
    setApiSecret("");
    setPassphrase("");
    setStatus(null);
    onKeysChange?.(null);
  }

  const inputStyle = {
    width: "100%",
    background: "#070a13",
    border: "1px solid #1a1f2e",
    borderRadius: 6,
    padding: "10px 40px 10px 12px",
    color: "#e8eaf6",
    fontFamily: "'Space Mono', monospace",
    fontSize: 12,
    outline: "none",
    letterSpacing: 1,
    transition: "border-color 0.2s",
  };

  return (
    <>
      {/* CONNECT BUTTON */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 14px",
          background: connected ? "#0d2b1a" : "#0a0e1a",
          border: `1px solid ${connected ? "#00c853" : "#1a1f2e"}`,
          borderRadius: 6,
          color: connected ? "#00c853" : "#546e7a",
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = connected ? "#00c853" : "#3d5afe"}
        onMouseLeave={e => e.currentTarget.style.borderColor = connected ? "#00c853" : "#1a1f2e"}
      >
        <SHIELD_ICON />
        {connected ? "CONNECTED" : "CONNECT BITGET"}
      </button>

      {/* MODAL OVERLAY */}
      {open && (
        <div
          onClick={e => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(7,10,19,0.92)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div style={{
            background: "#0a0e1a",
            border: "1px solid #1a1f2e",
            borderRadius: 14,
            padding: 32,
            width: "100%",
            maxWidth: 480,
            animation: "fadeIn 0.2s ease",
            position: "relative",
          }}>

            {/* HEADER */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ color: "#00c853" }}><SHIELD_ICON /></div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, letterSpacing: 2 }}>
                  CONNECT BITGET
                </span>
              </div>
              <button onClick={() => setOpen(false)} style={{
                background: "none", border: "none", color: "#37474f",
                fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4,
              }}>✕</button>
            </div>

            {/* SECURITY NOTICE */}
            <div style={{
              background: "#071a0f",
              border: "1px solid #1b5e2060",
              borderRadius: 8,
              padding: "14px 16px",
              marginBottom: 24,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ color: "#00c853", marginTop: 1, flexShrink: 0 }}><SHIELD_ICON /></div>
                <div>
                  <div style={{ color: "#00c853", fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
                    YOUR FUNDS ARE SAFU
                  </div>
                  <div style={{ color: "#4caf50", fontSize: 12, lineHeight: 1.7 }}>
                    We <strong style={{ color: "#81c784" }}>never store your API keys</strong> — they are sent directly with each request and immediately discarded. We have zero access to your funds or account. For maximum safety, use a <strong style={{ color: "#81c784" }}>read-only API key</strong> with no withdrawal permissions.
                  </div>
                </div>
              </div>
            </div>

            {/* SECURITY CHECKLIST */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 24,
            }}>
              {[
                "Keys never saved to database",
                "No withdrawal permissions needed",
                "Keys discarded after each request",
                "Read-only access is all we need",
                "Your funds stay in your account",
                "Open source — verify yourself",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <CHECK_ICON />
                  <span style={{ color: "#546e7a", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* READ-ONLY WARNING */}
            <div style={{
              background: "#1a1500",
              border: "1px solid #f57f1760",
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 20,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ color: "#ffb74d", fontSize: 11, fontFamily: "'Space Mono', monospace", lineHeight: 1.6 }}>
                When creating your API key on Bitget, enable <strong>Read Only</strong> and <strong>disable</strong> Trade, Withdraw, and Transfer permissions.
              </span>
            </div>

            {/* INPUTS */}
            {[
              { label: "API KEY", value: apiKey, setter: setApiKey, show: showKey, toggleShow: () => setShowKey(v => !v), placeholder: "Enter your Bitget API Key" },
              { label: "API SECRET", value: apiSecret, setter: setApiSecret, show: showSecret, toggleShow: () => setShowSecret(v => !v), placeholder: "Enter your Bitget API Secret" },
              { label: "PASSPHRASE", value: passphrase, setter: setPassphrase, show: showPass, toggleShow: () => setShowPass(v => !v), placeholder: "Enter your Bitget Passphrase" },
            ].map(({ label, value, setter, show, toggleShow, placeholder }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ color: "#3d4f8a", fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 700, letterSpacing: 2 }}>
                    {label}
                  </span>
                  <span style={{ color: "#1a2040", fontSize: 10 }}><LOCK_ICON /></span>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={e => setter(e.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      ...inputStyle,
                      borderColor: status === "error" && !value ? "#f44336" : "#1a1f2e",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "#3d5afe"}
                    onBlur={e => e.currentTarget.style.borderColor = "#1a1f2e"}
                  />
                  <button
                    onClick={toggleShow}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", color: "#37474f",
                      cursor: "pointer", padding: 4,
                    }}
                  >
                    <EYE_ICON open={show} />
                  </button>
                </div>
              </div>
            ))}

            {/* ERROR MESSAGE */}
            {status === "error" && errorMsg && (
              <div style={{
                background: "#2b0d0d",
                border: "1px solid #f4433640",
                borderRadius: 6,
                padding: "10px 14px",
                marginBottom: 16,
                color: "#ef9a9a",
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                lineHeight: 1.6,
              }}>
                ⚠ {errorMsg}
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {status === "connected" && (
              <div style={{
                background: "#071a0f",
                border: "1px solid #00c85340",
                borderRadius: 6,
                padding: "10px 14px",
                marginBottom: 16,
                color: "#81c784",
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <CHECK_ICON /> Connected successfully! Closing...
              </div>
            )}

            {/* BUTTONS */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              {connected ? (
                <button onClick={handleDisconnect} style={{
                  flex: 1, padding: "12px", background: "#2b0d0d",
                  border: "1px solid #f4433640", borderRadius: 8,
                  color: "#f44336", fontFamily: "'Space Mono', monospace",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: 1,
                }}>
                  DISCONNECT
                </button>
              ) : (
                <button onClick={handleConnect} disabled={status === "connecting"}
                  style={{
                    flex: 1, padding: "12px",
                    background: status === "connecting" ? "#0d1117" : "linear-gradient(135deg, #1a237e, #283593)",
                    border: `1px solid ${status === "connecting" ? "#1a1f2e" : "#3d5afe40"}`,
                    borderRadius: 8,
                    color: status === "connecting" ? "#37474f" : "#e8eaf6",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 12, fontWeight: 700,
                    cursor: status === "connecting" ? "not-allowed" : "pointer",
                    letterSpacing: 1,
                    transition: "all 0.2s",
                  }}
                >
                  {status === "connecting" ? "VERIFYING..." : "CONNECT"}
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{
                padding: "12px 20px", background: "transparent",
                border: "1px solid #1a1f2e", borderRadius: 8,
                color: "#37474f", fontFamily: "'Space Mono', monospace",
                fontSize: 12, cursor: "pointer",
              }}>
                CANCEL
              </button>
            </div>

            {/* FOOTER LINK */}
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <a
                href="https://www.bitget.com/api-setup"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#3d5afe", fontSize: 11, fontFamily: "'Space Mono', monospace", textDecoration: "none" }}
              >
                How to create a Bitget API key →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
