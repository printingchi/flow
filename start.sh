#!/bin/bash
# ============================================
# FLOW — Full Project Startup Script
# ============================================
# Starts both the Next.js frontend and the
# Python Qiskit quantum engine simultaneously.
#
# Usage:
#   chmod +x start.sh
#   ./start.sh

echo ""
echo "🪐 FLOW — Orbital Trading Engine"
echo "================================="
echo ""

# ── Check Python ──────────────────────────────
if ! command -v python3 &> /dev/null; then
  echo "❌ Python3 not found. Install from https://python.org"
  exit 1
fi

# ── Check Node ────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

# ── Install Python deps if needed ─────────────
if ! python3 -c "import qiskit" 2>/dev/null; then
  echo "📦 Installing Python quantum dependencies..."
  pip install -r quantum/requirements.txt
  echo "✅ Python deps installed"
fi

# ── Install Node deps if needed ───────────────
if [ ! -d "node_modules" ]; then
  echo "📦 Installing Node.js dependencies..."
  npm install
  echo "✅ Node deps installed"
fi

echo ""
echo "🔬 Starting Quantum Engine (port 5001)..."
python3 quantum/quantum_blend.py --serve --port 5001 &
QUANTUM_PID=$!

# Wait for quantum server to boot
sleep 3

echo "🌐 Starting Next.js (port 3000)..."
npm run dev &
NEXT_PID=$!

echo ""
echo "✅ FLOW is running!"
echo "   Frontend:       http://localhost:3000"
echo "   Quantum Engine: http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# ── Cleanup on exit ───────────────────────────
trap "echo ''; echo 'Shutting down...'; kill $QUANTUM_PID $NEXT_PID 2>/dev/null; exit 0" INT TERM

wait
