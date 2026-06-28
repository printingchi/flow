"""
FLOW — Quantum Signal Blending Engine
======================================
File: /quantum/quantum_blend.py

Uses Qiskit to build a real quantum circuit that blends three orbital
component scores (periodicity, velocity, gravitational) via quantum
amplitude encoding and interference gates.

How it works:
  1. Encode each score as a rotation angle on a qubit (amplitude encoding)
  2. Apply Hadamard gates to create superposition
  3. Apply CNOT entanglement gates to link correlated signals
  4. Apply phase kickback to amplify aligned signals
  5. Measure: high probability = strong aligned signal, low = conflicting

Install:
  pip install qiskit qiskit-aer flask

Run standalone:
  python quantum_blend.py

Run as API server:
  python quantum_blend.py --serve
"""

import sys
import json
import math
import argparse
import numpy as np

from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit_aer import AerSimulator
from qiskit.circuit.library import RYGate, RZGate


# ─────────────────────────────────────────────
# QUANTUM BLEND CIRCUIT
# ─────────────────────────────────────────────

def build_orbital_circuit(periodicity: float, velocity: float, gravitational: float) -> QuantumCircuit:
    """
    Builds a 3-qubit quantum circuit encoding three orbital signals.
    
    Each qubit encodes one orbital component as an RY rotation:
      |0⟩ → cos(θ/2)|0⟩ + sin(θ/2)|1⟩
    where θ = score * π
    
    High score → qubit closer to |1⟩
    Low score  → qubit closer to |0⟩
    
    Interference via entanglement: when signals align, measurement
    probability of |111⟩ (all bullish) or |000⟩ (all bearish) increases.
    """
    qr = QuantumRegister(3, 'orbital')
    cr = ClassicalRegister(3, 'signal')
    qc = QuantumCircuit(qr, cr)

    # ── STEP 1: Amplitude Encoding ──────────────────
    # Map each score [0,1] to rotation angle [0, π]
    theta_p = periodicity    * math.pi   # periodicity qubit
    theta_v = velocity       * math.pi   # velocity qubit
    theta_g = gravitational  * math.pi   # gravitational qubit

    qc.ry(theta_p, qr[0])  # Periodicity
    qc.ry(theta_v, qr[1])  # Velocity
    qc.ry(theta_g, qr[2])  # Gravitational

    qc.barrier()

    # ── STEP 2: Superposition Layer ─────────────────
    # Hadamard creates equal superposition — signals now interfere
    qc.h(qr[0])
    qc.h(qr[1])
    qc.h(qr[2])

    qc.barrier()

    # ── STEP 3: Entanglement (Signal Correlation) ───
    # CNOT gates entangle signals — aligned signals reinforce each other
    qc.cx(qr[0], qr[1])   # Periodicity → Velocity
    qc.cx(qr[1], qr[2])   # Velocity → Gravitational
    qc.cx(qr[2], qr[0])   # Gravitational → Periodicity (circular)

    qc.barrier()

    # ── STEP 4: Phase Kickback ───────────────────────
    # RZ rotations add phase based on original signal strength
    # Constructive interference when signals align
    qc.rz(theta_p * 0.5, qr[0])
    qc.rz(theta_v * 0.5, qr[1])
    qc.rz(theta_g * 0.5, qr[2])

    qc.barrier()

    # ── STEP 5: Inverse Hadamard (Interference Readout) ─
    qc.h(qr[0])
    qc.h(qr[1])
    qc.h(qr[2])

    qc.barrier()

    # ── STEP 6: Measure ──────────────────────────────
    qc.measure(qr, cr)

    return qc


# ─────────────────────────────────────────────
# EXECUTE CIRCUIT + INTERPRET RESULTS
# ─────────────────────────────────────────────

def run_quantum_blend(
    periodicity: float,
    velocity: float,
    gravitational: float,
    shots: int = 1024
) -> dict:
    """
    Runs the orbital quantum circuit on Aer simulator.
    
    Returns:
      - quantum_signal: float [0,1] — blended signal strength
      - direction: 'bullish' | 'bearish' | 'neutral'
      - confluence: float [0,1] — how strongly signals aligned
      - counts: raw measurement counts
      - circuit_depth: int
    """
    # Clamp inputs to [0, 1]
    p = max(0.0, min(1.0, float(periodicity)))
    v = max(0.0, min(1.0, float(velocity)))
    g = max(0.0, min(1.0, float(gravitational)))

    # Build circuit
    qc = build_orbital_circuit(p, v, g)

    # Run on Aer simulator
    simulator = AerSimulator()
    job = simulator.run(qc, shots=shots)
    result = job.result()
    counts = result.get_counts(qc)

    total_shots = sum(counts.values())

    # ── Interpret measurement outcomes ───────────────
    # |111⟩ = all signals high → BULLISH confluence
    # |000⟩ = all signals low  → BEARISH confluence
    # Mixed  = conflicting signals → NEUTRAL / HOLD

    bullish_states = {'111', '110', '101', '011'}
    bearish_states = {'000', '001', '010', '100'}

    bullish_count = sum(counts.get(s, 0) for s in bullish_states)
    bearish_count = sum(counts.get(s, 0) for s in bearish_states)

    bullish_prob = bullish_count / total_shots
    bearish_prob = bearish_count / total_shots

    # Strong confluence = dominant state has high probability
    max_single_state_prob = max(counts.values()) / total_shots
    confluence = max_single_state_prob

    # Dominant direction
    if bullish_prob > bearish_prob + 0.1:
        direction = 'bullish'
        quantum_signal = bullish_prob
    elif bearish_prob > bullish_prob + 0.1:
        direction = 'bearish'
        quantum_signal = bearish_prob
    else:
        direction = 'neutral'
        quantum_signal = 0.5 - abs(bullish_prob - bearish_prob)

    # Boost signal when all three inputs align strongly
    alignment_bonus = 0.0
    avg_input = (p + v + g) / 3
    spread = max(p, v, g) - min(p, v, g)
    if spread < 0.2:  # All three signals close together
        alignment_bonus = (1 - spread) * 0.1

    final_signal = min(quantum_signal + alignment_bonus, 1.0)

    # Trade signal classification
    if final_signal > 0.65 and direction == 'bullish':
        trade_signal = 'BUY'
    elif final_signal > 0.65 and direction == 'bearish':
        trade_signal = 'SELL'
    elif final_signal > 0.50 and direction == 'bullish':
        trade_signal = 'WATCH_LONG'
    elif final_signal > 0.50 and direction == 'bearish':
        trade_signal = 'WATCH_SHORT'
    else:
        trade_signal = 'HOLD'

    return {
        'quantum_signal': round(final_signal, 4),
        'direction': direction,
        'confluence': round(confluence, 4),
        'trade_signal': trade_signal,
        'bullish_probability': round(bullish_prob, 4),
        'bearish_probability': round(bearish_prob, 4),
        'circuit_depth': qc.depth(),
        'qubits': qc.num_qubits,
        'shots': shots,
        'counts': counts,
        'inputs': {
            'periodicity': p,
            'velocity': v,
            'gravitational': g,
        }
    }


# ─────────────────────────────────────────────
# MULTI-TIMEFRAME QUANTUM AGGREGATION
# ─────────────────────────────────────────────

def quantum_aggregate_timeframes(timeframe_signals: dict) -> dict:
    """
    Runs quantum blending for each timeframe independently,
    then aggregates using timeframe weights.
    
    Args:
      timeframe_signals: {
        '1m':  { 'periodicity': 0.6, 'velocity': 0.7, 'gravitational': 0.5 },
        '1h':  { 'periodicity': 0.8, 'velocity': 0.9, 'gravitational': 0.7 },
        ...
      }
    
    Returns aggregated quantum signal across all timeframes.
    """
    TIMEFRAME_WEIGHTS = {
        '1m':  0.05,
        '5m':  0.08,
        '15m': 0.12,
        '30m': 0.15,
        '1h':  0.20,
        '4h':  0.25,
        '1D':  0.15,
    }

    results = {}
    weighted_signal = 0.0
    total_weight = 0.0
    vote_weights = {'BUY': 0, 'SELL': 0, 'HOLD': 0, 'WATCH_LONG': 0, 'WATCH_SHORT': 0}

    for tf, components in timeframe_signals.items():
        weight = TIMEFRAME_WEIGHTS.get(tf, 0.10)

        result = run_quantum_blend(
            periodicity=components.get('periodicity', 0.5),
            velocity=components.get('velocity', 0.5),
            gravitational=components.get('gravitational', 0.5),
            shots=512  # Fewer shots per TF for speed
        )

        result['timeframe'] = tf
        result['weight'] = weight
        results[tf] = result

        weighted_signal += result['quantum_signal'] * weight
        total_weight += weight
        vote_weights[result['trade_signal']] = vote_weights.get(result['trade_signal'], 0) + weight

    # Normalize
    aggregate = weighted_signal / total_weight if total_weight > 0 else 0.5

    # Consensus
    consensus = max(vote_weights, key=vote_weights.get)
    max_vote = max(vote_weights.values())
    confluence = max_vote / total_weight if total_weight > 0 else 0

    return {
        'aggregate_quantum_signal': round(aggregate, 4),
        'consensus_signal': consensus,
        'quantum_confluence': round(confluence, 4),
        'confluence_level': 'HIGH' if confluence > 0.7 else 'MEDIUM' if confluence > 0.5 else 'LOW',
        'vote_weights': vote_weights,
        'timeframe_results': results,
    }


# ─────────────────────────────────────────────
# FLASK API SERVER (called by Next.js)
# ─────────────────────────────────────────────

def start_server(port: int = 5001):
    from flask import Flask, request, jsonify
    from flask_cors import CORS

    app = Flask(__name__)
    CORS(app)

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({ 'status': 'ok', 'engine': 'FLOW Quantum Blend v1.0' })

    @app.route('/quantum/blend', methods=['POST'])
    def blend():
        """
        Single timeframe quantum blend.
        Body: { periodicity, velocity, gravitational, shots? }
        """
        try:
            body = request.get_json()
            result = run_quantum_blend(
                periodicity=body.get('periodicity', 0.5),
                velocity=body.get('velocity', 0.5),
                gravitational=body.get('gravitational', 0.5),
                shots=body.get('shots', 1024),
            )
            return jsonify({ 'success': True, 'result': result })
        except Exception as e:
            return jsonify({ 'success': False, 'error': str(e) }), 500

    @app.route('/quantum/aggregate', methods=['POST'])
    def aggregate():
        """
        Multi-timeframe quantum aggregation.
        Body: { timeframes: { '1h': { periodicity, velocity, gravitational }, ... } }
        """
        try:
            body = request.get_json()
            timeframe_signals = body.get('timeframes', {})
            if not timeframe_signals:
                return jsonify({ 'success': False, 'error': 'timeframes required' }), 400

            result = quantum_aggregate_timeframes(timeframe_signals)
            return jsonify({ 'success': True, 'result': result })
        except Exception as e:
            return jsonify({ 'success': False, 'error': str(e) }), 500

    @app.route('/quantum/circuit', methods=['POST'])
    def circuit_info():
        """
        Returns circuit diagram as text for visualization.
        Body: { periodicity, velocity, gravitational }
        """
        try:
            body = request.get_json()
            p = float(body.get('periodicity', 0.5))
            v = float(body.get('velocity', 0.5))
            g = float(body.get('gravitational', 0.5))
            qc = build_orbital_circuit(p, v, g)
            return jsonify({
                'success': True,
                'circuit_diagram': str(qc.draw(output='text')),
                'depth': qc.depth(),
                'qubits': qc.num_qubits,
                'gates': qc.count_ops(),
            })
        except Exception as e:
            return jsonify({ 'success': False, 'error': str(e) }), 500

    print(f"\n🪐 FLOW Quantum Engine running on http://localhost:{port}")
    print(f"   POST /quantum/blend      — single timeframe blend")
    print(f"   POST /quantum/aggregate  — multi-timeframe aggregation")
    print(f"   POST /quantum/circuit    — circuit diagram\n")
    app.run(host='0.0.0.0', port=port, debug=False)


# ─────────────────────────────────────────────
# STANDALONE TEST
# ─────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', action='store_true', help='Start Flask API server')
    parser.add_argument('--port', type=int, default=5001)
    args = parser.parse_args()

    if args.serve:
        start_server(args.port)
    else:
        print("\n🪐 FLOW Quantum Blend — Test Run\n")

        # Test single blend
        result = run_quantum_blend(
            periodicity=0.8,
            velocity=0.75,
            gravitational=0.7,
            shots=1024
        )

        print(f"Inputs:            P={result['inputs']['periodicity']}  V={result['inputs']['velocity']}  G={result['inputs']['gravitational']}")
        print(f"Quantum Signal:    {result['quantum_signal']}")
        print(f"Direction:         {result['direction']}")
        print(f"Trade Signal:      {result['trade_signal']}")
        print(f"Confluence:        {result['confluence']}")
        print(f"Bullish Prob:      {result['bullish_probability']}")
        print(f"Bearish Prob:      {result['bearish_probability']}")
        print(f"Circuit Depth:     {result['circuit_depth']}")
        print(f"Qubits:            {result['qubits']}")
        print(f"Shots:             {result['shots']}")
        print(f"\nRaw Counts: {result['counts']}")

        # Test multi-timeframe
        print("\n─── Multi-Timeframe Quantum Aggregation ───\n")
        mtf_result = quantum_aggregate_timeframes({
            '15m': { 'periodicity': 0.6, 'velocity': 0.65, 'gravitational': 0.55 },
            '1h':  { 'periodicity': 0.8, 'velocity': 0.75, 'gravitational': 0.70 },
            '4h':  { 'periodicity': 0.85, 'velocity': 0.80, 'gravitational': 0.78 },
        })

        print(f"Aggregate Quantum Signal: {mtf_result['aggregate_quantum_signal']}")
        print(f"Consensus:                {mtf_result['consensus_signal']}")
        print(f"Quantum Confluence:       {mtf_result['quantum_confluence']} ({mtf_result['confluence_level']})")
        print(f"\nPer-Timeframe:")
        for tf, r in mtf_result['timeframe_results'].items():
            print(f"  {tf.ljust(5)} | Signal: {r['quantum_signal']} | {r['trade_signal'].ljust(12)} | {r['direction']}")
