"""
FLOW — Backtesting Engine
==========================
File: /backtest/backtest_engine.py

Runs historical simulation of orbital trading signals.

Outputs:
  1. P&L Curve + Win Rate + Sharpe Ratio
  2. Full Trade Log + Drawdown Analysis
  3. Complete Performance Report (JSON + CSV)
  4. Orbital Signal Heatmap vs Price Action

Install:
  pip install pandas numpy matplotlib seaborn requests

Run:
  python backtest_engine.py --symbol BTCUSDT --type crypto --start 2024-01-01 --end 2024-12-31
  python backtest_engine.py --symbol AAPL --type stock --start 2023-01-01 --end 2024-01-01
"""

import sys
import os
import json
import math
import argparse
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional

# Add parent dir to path for orbitalEngine import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ─────────────────────────────────────────────
# ORBITAL SIGNAL ENGINE (pure Python port)
# ─────────────────────────────────────────────

def fft_magnitude(prices):
    """Compute FFT and return dominant frequency magnitude."""
    n = len(prices)
    if n < 4:
        return 0.0
    arr = np.array(prices, dtype=float)
    spectrum = np.fft.rfft(arr)
    magnitudes = np.abs(spectrum[1:n//2])
    if len(magnitudes) == 0:
        return 0.0
    max_mag = np.max(magnitudes)
    total_mag = np.sum(magnitudes)
    if total_mag == 0:
        return 0.0
    dominant_idx = np.argmax(magnitudes) + 1
    phase = np.angle(spectrum[dominant_idx])
    cycle_strength = max_mag / total_mag
    return float(min(cycle_strength * (1 + abs(math.sin(phase * math.pi))), 1.0))


def calc_periodicity(prices):
    return fft_magnitude(prices)


def calc_velocity(prices):
    if len(prices) < 3:
        return {'score': 0.0, 'direction': 'neutral', 'momentum': 'steady'}
    arr = np.array(prices, dtype=float)
    returns = np.diff(arr) / arr[:-1]
    if len(returns) < 2:
        return {'score': 0.0, 'direction': 'neutral', 'momentum': 'steady'}
    accel = np.diff(returns)
    avg_vel = np.mean(np.abs(returns))
    window = max(3, int(len(returns) * 0.2))
    recent_vel = np.mean(np.abs(returns[-window:]))
    vel_ratio = recent_vel / avg_vel if avg_vel > 0 else 0
    avg_acc = np.mean(np.abs(accel)) if len(accel) > 0 else 0
    recent_acc = np.mean(np.abs(accel[-window:])) if len(accel) >= window else avg_acc
    acc_ratio = recent_acc / avg_acc if avg_acc > 0 else 0
    direction_score = np.mean(np.sign(returns[-5:])) if len(returns) >= 5 else 0
    raw = vel_ratio * 0.5 + acc_ratio * 0.3 + abs(direction_score) * 0.2
    direction = 'bullish' if direction_score > 0.2 else 'bearish' if direction_score < -0.2 else 'neutral'
    momentum = 'accelerating' if vel_ratio > 1.2 else 'decelerating' if vel_ratio < 0.8 else 'steady'
    return {'score': float(min(raw, 1.0)), 'direction': direction, 'momentum': momentum}


def calc_gravitational(prices):
    if len(prices) < 5:
        return {'score': 0.0, 'nearestZone': 'unknown'}
    arr = np.array(prices, dtype=float)
    current = arr[-1]
    highest = np.max(arr)
    lowest = np.min(arr)
    price_range = highest - lowest
    if price_range == 0:
        return {'score': 0.0, 'nearestZone': 'unknown'}
    lookback = max(2, int(len(arr) * 0.1))
    pivots = []
    for i in range(lookback, len(arr) - lookback):
        window = arr[i - lookback: i + lookback + 1]
        if arr[i] == np.max(window):
            pivots.append({'price': arr[i], 'type': 'resistance'})
        if arr[i] == np.min(window):
            pivots.append({'price': arr[i], 'type': 'support'})
    if not pivots:
        return {'score': 0.5, 'nearestZone': 'unknown'}
    total_gravity = 0
    for p in pivots:
        dist = abs(current - p['price']) / price_range
        gravity = 1.0 / (dist ** 2 + 0.01)
        total_gravity += gravity
    nearest = min(pivots, key=lambda p: abs(current - p['price']))
    proximity = 1 - (abs(current - nearest['price']) / price_range)
    score = float(min(proximity * 0.6 + min(total_gravity / 100, 0.4), 1.0))
    return {'score': score, 'nearestZone': nearest['type']}


def quantum_blend_classical(p, v, g):
    """Classical approximation of quantum interference blend."""
    amp_p = math.sqrt(max(p, 0))
    amp_v = math.sqrt(max(v, 0))
    amp_g = math.sqrt(max(g, 0))
    interference = (amp_p * amp_v + amp_v * amp_g + amp_g * amp_p) / 3
    base = p * 0.30 + v * 0.40 + g * 0.30
    return min(base + interference * 0.15, 1.0)


def orbital_signal(prices, direction='neutral'):
    """Full orbital signal for a price window."""
    if len(prices) < 10:
        return None
    p_score = calc_periodicity(prices)
    v_result = calc_velocity(prices)
    g_result = calc_gravitational(prices)
    v_score = v_result['score']
    g_score = g_result['score']
    blended = quantum_blend_classical(p_score, v_score, g_score)
    dir_ = v_result['direction']
    zone = g_result['nearestZone']
    if blended > 0.65 and dir_ == 'bullish' and zone == 'support':
        trade_signal = 'BUY'
    elif blended > 0.65 and dir_ == 'bearish' and zone == 'resistance':
        trade_signal = 'SELL'
    elif blended > 0.55 and dir_ == 'bullish':
        trade_signal = 'WATCH_LONG'
    elif blended > 0.55 and dir_ == 'bearish':
        trade_signal = 'WATCH_SHORT'
    else:
        trade_signal = 'HOLD'
    return {
        'signal': round(blended, 4),
        'trade_signal': trade_signal,
        'direction': dir_,
        'periodicity': round(p_score, 4),
        'velocity': round(v_score, 4),
        'gravitational': round(g_score, 4),
        'nearest_zone': zone,
    }


# ─────────────────────────────────────────────
# DATA FETCHERS
# ─────────────────────────────────────────────

def fetch_bitget_history(symbol: str, granularity: str = '1H', limit: int = 500) -> pd.DataFrame:
    """Fetch historical OHLCV from Bitget V2."""
    import requests
    url = f'https://api.bitget.com/api/v2/mix/market/candles'
    params = {
        'symbol': symbol,
        'granularity': granularity,
        'limit': limit,
        'productType': 'USDT-FUTURES',
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    if data.get('code') != '00000':
        raise ValueError(f"Bitget error: {data.get('msg')}")
    candles = data.get('data', [])
    df = pd.DataFrame(candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume', 'quote_volume'])
    df['timestamp'] = pd.to_datetime(df['timestamp'].astype(int), unit='ms')
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)
    df = df.sort_values('timestamp').reset_index(drop=True)
    return df


def fetch_yahoo_history(symbol: str, interval: str = '1h', period: str = '1y') -> pd.DataFrame:
    """Fetch historical OHLCV from Yahoo Finance."""
    import requests
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}'
    params = {'interval': interval, 'range': period}
    headers = {'User-Agent': 'Mozilla/5.0'}
    resp = requests.get(url, params=params, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    result = data['chart']['result'][0]
    timestamps = result['timestamp']
    quotes = result['indicators']['quote'][0]
    df = pd.DataFrame({
        'timestamp': pd.to_datetime(timestamps, unit='s'),
        'open':   quotes.get('open', []),
        'high':   quotes.get('high', []),
        'low':    quotes.get('low', []),
        'close':  quotes.get('close', []),
        'volume': quotes.get('volume', []),
    })
    df = df.dropna(subset=['close']).reset_index(drop=True)
    return df


def generate_mock_data(n: int = 500, start_price: float = 60000.0, volatility: float = 0.02) -> pd.DataFrame:
    """Generate synthetic OHLCV data for testing."""
    np.random.seed(42)
    prices = [start_price]
    for _ in range(n - 1):
        change = np.random.normal(0, volatility)
        prices.append(prices[-1] * (1 + change))
    timestamps = pd.date_range(start='2024-01-01', periods=n, freq='1h')
    closes = np.array(prices)
    highs = closes * (1 + np.abs(np.random.normal(0, 0.005, n)))
    lows = closes * (1 - np.abs(np.random.normal(0, 0.005, n)))
    opens = np.roll(closes, 1)
    volumes = np.random.uniform(100, 10000, n)
    return pd.DataFrame({
        'timestamp': timestamps,
        'open': opens, 'high': highs,
        'low': lows, 'close': closes,
        'volume': volumes,
    })


# ─────────────────────────────────────────────
# BACKTESTING ENGINE
# ─────────────────────────────────────────────

class FlowBacktester:
    def __init__(
        self,
        initial_capital: float = 10000.0,
        position_size_pct: float = 0.10,   # 10% of capital per trade
        stop_loss_pct: float = 0.02,        # 2% stop loss
        take_profit_pct: float = 0.04,      # 4% take profit (2:1 RR)
        lookback: int = 50,                 # Candles for signal calculation
        signal_threshold: float = 0.65,     # Min signal strength to enter
        commission_pct: float = 0.001,      # 0.1% per trade
    ):
        self.initial_capital = initial_capital
        self.position_size_pct = position_size_pct
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        self.lookback = lookback
        self.signal_threshold = signal_threshold
        self.commission_pct = commission_pct

    def run(self, df: pd.DataFrame, symbol: str = 'ASSET') -> dict:
        """
        Run full backtest on OHLCV DataFrame.
        Returns complete performance report.
        """
        if len(df) < self.lookback + 10:
            raise ValueError(f"Need at least {self.lookback + 10} candles. Got {len(df)}.")

        capital = self.initial_capital
        position = None   # {'type': 'long'|'short', 'entry_price', 'size', 'entry_idx', 'entry_time', 'stop', 'target'}
        trades = []
        equity_curve = []
        signal_history = []

        closes = df['close'].values
        timestamps = df['timestamp'].values

        for i in range(self.lookback, len(df)):
            price = closes[i]
            ts = timestamps[i]
            current_equity = capital + (position['unrealized_pnl'] if position else 0)
            equity_curve.append({'timestamp': str(ts), 'equity': round(current_equity, 2), 'price': round(price, 4)})

            # ── Calculate orbital signal ──────────────────
            window = closes[i - self.lookback: i]
            sig = orbital_signal(window)
            if sig:
                sig['timestamp'] = str(ts)
                sig['price'] = round(price, 4)
                signal_history.append(sig)

            # ── Manage open position ──────────────────────
            if position:
                if position['type'] == 'long':
                    position['unrealized_pnl'] = (price - position['entry_price']) * position['size']
                    # Stop loss
                    if price <= position['stop']:
                        pnl = (position['stop'] - position['entry_price']) * position['size']
                        pnl -= position['entry_price'] * position['size'] * self.commission_pct
                        capital += position['entry_price'] * position['size'] + pnl
                        trades.append(self._close_trade(position, price, ts, pnl, 'stop_loss'))
                        position = None
                    # Take profit
                    elif price >= position['target']:
                        pnl = (position['target'] - position['entry_price']) * position['size']
                        pnl -= position['entry_price'] * position['size'] * self.commission_pct
                        capital += position['entry_price'] * position['size'] + pnl
                        trades.append(self._close_trade(position, price, ts, pnl, 'take_profit'))
                        position = None
                    # Signal reversal exit
                    elif sig and sig['trade_signal'] in ['SELL', 'WATCH_SHORT']:
                        pnl = (price - position['entry_price']) * position['size']
                        pnl -= position['entry_price'] * position['size'] * self.commission_pct
                        capital += position['entry_price'] * position['size'] + pnl
                        trades.append(self._close_trade(position, price, ts, pnl, 'signal_exit'))
                        position = None

                elif position['type'] == 'short':
                    position['unrealized_pnl'] = (position['entry_price'] - price) * position['size']
                    if price >= position['stop']:
                        pnl = (position['entry_price'] - position['stop']) * position['size']
                        pnl -= position['entry_price'] * position['size'] * self.commission_pct
                        capital += position['entry_price'] * position['size'] + pnl
                        trades.append(self._close_trade(position, price, ts, pnl, 'stop_loss'))
                        position = None
                    elif price <= position['target']:
                        pnl = (position['entry_price'] - position['target']) * position['size']
                        pnl -= position['entry_price'] * position['size'] * self.commission_pct
                        capital += position['entry_price'] * position['size'] + pnl
                        trades.append(self._close_trade(position, price, ts, pnl, 'take_profit'))
                        position = None
                    elif sig and sig['trade_signal'] in ['BUY', 'WATCH_LONG']:
                        pnl = (position['entry_price'] - price) * position['size']
                        pnl -= position['entry_price'] * position['size'] * self.commission_pct
                        capital += position['entry_price'] * position['size'] + pnl
                        trades.append(self._close_trade(position, price, ts, pnl, 'signal_exit'))
                        position = None

            # ── Enter new position ────────────────────────
            if not position and sig and sig['signal'] >= self.signal_threshold:
                trade_size_usd = capital * self.position_size_pct
                size = trade_size_usd / price
                commission = trade_size_usd * self.commission_pct
                capital -= trade_size_usd + commission

                if sig['trade_signal'] == 'BUY':
                    position = {
                        'type': 'long',
                        'entry_price': price,
                        'size': size,
                        'entry_idx': i,
                        'entry_time': str(ts),
                        'stop': price * (1 - self.stop_loss_pct),
                        'target': price * (1 + self.take_profit_pct),
                        'signal': sig['signal'],
                        'unrealized_pnl': 0,
                    }
                elif sig['trade_signal'] == 'SELL':
                    position = {
                        'type': 'short',
                        'entry_price': price,
                        'size': size,
                        'entry_idx': i,
                        'entry_time': str(ts),
                        'stop': price * (1 + self.stop_loss_pct),
                        'target': price * (1 - self.take_profit_pct),
                        'signal': sig['signal'],
                        'unrealized_pnl': 0,
                    }

        # Close any open position at end
        if position:
            price = closes[-1]
            ts = timestamps[-1]
            if position['type'] == 'long':
                pnl = (price - position['entry_price']) * position['size']
            else:
                pnl = (position['entry_price'] - price) * position['size']
            pnl -= position['entry_price'] * position['size'] * self.commission_pct
            capital += position['entry_price'] * position['size'] + pnl
            trades.append(self._close_trade(position, price, ts, pnl, 'end_of_data'))

        return self._compile_report(
            symbol=symbol,
            trades=trades,
            equity_curve=equity_curve,
            signal_history=signal_history,
            final_capital=capital,
            df=df,
        )

    def _close_trade(self, position, exit_price, exit_time, pnl, exit_reason):
        return {
            'type': position['type'],
            'entry_time': position['entry_time'],
            'exit_time': str(exit_time),
            'entry_price': round(position['entry_price'], 4),
            'exit_price': round(exit_price, 4),
            'size': round(position['size'], 6),
            'pnl': round(pnl, 2),
            'pnl_pct': round(pnl / (position['entry_price'] * position['size']) * 100, 2),
            'exit_reason': exit_reason,
            'orbital_signal': position.get('signal', 0),
        }

    def _compile_report(self, symbol, trades, equity_curve, signal_history, final_capital, df):
        total_trades = len(trades)
        winning_trades = [t for t in trades if t['pnl'] > 0]
        losing_trades = [t for t in trades if t['pnl'] <= 0]

        win_rate = len(winning_trades) / total_trades if total_trades > 0 else 0
        total_pnl = sum(t['pnl'] for t in trades)
        total_return_pct = (final_capital - self.initial_capital) / self.initial_capital * 100
        avg_win = np.mean([t['pnl'] for t in winning_trades]) if winning_trades else 0
        avg_loss = np.mean([t['pnl'] for t in losing_trades]) if losing_trades else 0
        profit_factor = abs(sum(t['pnl'] for t in winning_trades) / sum(t['pnl'] for t in losing_trades)) if losing_trades else float('inf')

        # ── Equity curve metrics ──────────────────────
        equities = [e['equity'] for e in equity_curve]
        equity_series = pd.Series(equities)
        returns = equity_series.pct_change().dropna()

        # Sharpe ratio (annualized, assuming hourly data)
        if returns.std() > 0:
            sharpe = (returns.mean() / returns.std()) * math.sqrt(8760)  # 8760 hours/year
        else:
            sharpe = 0.0

        # Max drawdown
        rolling_max = equity_series.cummax()
        drawdown_series = (equity_series - rolling_max) / rolling_max * 100
        max_drawdown = drawdown_series.min()

        # Drawdown periods
        in_drawdown = False
        dd_start = None
        drawdown_periods = []
        for i, dd in enumerate(drawdown_series):
            if dd < -0.5 and not in_drawdown:
                in_drawdown = True
                dd_start = i
            elif dd >= -0.1 and in_drawdown:
                in_drawdown = False
                drawdown_periods.append({
                    'start_idx': dd_start,
                    'end_idx': i,
                    'max_dd_pct': round(drawdown_series[dd_start:i].min(), 2),
                    'duration_candles': i - dd_start,
                })

        # ── Heatmap data ─────────────────────────────
        heatmap_data = []
        if len(signal_history) > 0:
            sig_df = pd.DataFrame(signal_history)
            sig_df['timestamp'] = pd.to_datetime(sig_df['timestamp'])
            sig_df['hour'] = sig_df['timestamp'].dt.hour
            sig_df['day_of_week'] = sig_df['timestamp'].dt.day_name()
            heatmap_pivot = sig_df.pivot_table(
                values='signal',
                index='day_of_week',
                columns='hour',
                aggfunc='mean',
            ).fillna(0)
            heatmap_data = heatmap_pivot.to_dict()

        # ── Exit reason breakdown ─────────────────────
        exit_reasons = {}
        for t in trades:
            r = t['exit_reason']
            exit_reasons[r] = exit_reasons.get(r, 0) + 1

        return {
            'symbol': symbol,
            'backtest_config': {
                'initial_capital': self.initial_capital,
                'position_size_pct': self.position_size_pct,
                'stop_loss_pct': self.stop_loss_pct,
                'take_profit_pct': self.take_profit_pct,
                'lookback': self.lookback,
                'signal_threshold': self.signal_threshold,
                'commission_pct': self.commission_pct,
            },
            'performance': {
                'final_capital': round(final_capital, 2),
                'total_pnl': round(total_pnl, 2),
                'total_return_pct': round(total_return_pct, 2),
                'total_trades': total_trades,
                'winning_trades': len(winning_trades),
                'losing_trades': len(losing_trades),
                'win_rate': round(win_rate * 100, 2),
                'avg_win': round(avg_win, 2),
                'avg_loss': round(avg_loss, 2),
                'profit_factor': round(profit_factor, 2),
                'sharpe_ratio': round(sharpe, 3),
                'max_drawdown_pct': round(max_drawdown, 2),
                'best_trade': round(max((t['pnl'] for t in trades), default=0), 2),
                'worst_trade': round(min((t['pnl'] for t in trades), default=0), 2),
            },
            'trade_log': trades,
            'equity_curve': equity_curve,
            'drawdown_periods': drawdown_periods,
            'signal_heatmap': heatmap_data,
            'exit_reasons': exit_reasons,
            'signal_history': signal_history[-200:],  # Last 200 for payload size
        }


# ─────────────────────────────────────────────
# REPORT EXPORTER
# ─────────────────────────────────────────────

def export_report(report: dict, output_dir: str = './backtest_results'):
    """Export backtest report to JSON and CSV files."""
    import os
    os.makedirs(output_dir, exist_ok=True)
    symbol = report['symbol']
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Full JSON report
    json_path = f'{output_dir}/{symbol}_report_{ts}.json'
    with open(json_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    print(f'📄 JSON report:    {json_path}')

    # Trade log CSV
    if report['trade_log']:
        trade_df = pd.DataFrame(report['trade_log'])
        csv_path = f'{output_dir}/{symbol}_trades_{ts}.csv'
        trade_df.to_csv(csv_path, index=False)
        print(f'📊 Trade log CSV:  {csv_path}')

    # Equity curve CSV
    if report['equity_curve']:
        equity_df = pd.DataFrame(report['equity_curve'])
        eq_path = f'{output_dir}/{symbol}_equity_{ts}.csv'
        equity_df.to_csv(eq_path, index=False)
        print(f'📈 Equity curve:   {eq_path}')

    return json_path


def print_summary(report: dict):
    """Print formatted performance summary to console."""
    p = report['performance']
    print(f"""
╔══════════════════════════════════════════╗
║     🪐 FLOW Backtest Results             ║
╠══════════════════════════════════════════╣
║  Symbol:          {report['symbol']:<22}║
║  Final Capital:   ${p['final_capital']:<21,.2f}║
║  Total Return:    {p['total_return_pct']:>+.2f}%{'':<19}║
║  Total P&L:       ${p['total_pnl']:<21,.2f}║
╠══════════════════════════════════════════╣
║  Total Trades:    {p['total_trades']:<22}║
║  Win Rate:        {p['win_rate']:.1f}%{'':<20}║
║  Avg Win:         ${p['avg_win']:<21,.2f}║
║  Avg Loss:        ${p['avg_loss']:<21,.2f}║
║  Profit Factor:   {p['profit_factor']:<22.2f}║
╠══════════════════════════════════════════╣
║  Sharpe Ratio:    {p['sharpe_ratio']:<22.3f}║
║  Max Drawdown:    {p['max_drawdown_pct']:.2f}%{'':<19}║
║  Best Trade:      ${p['best_trade']:<21,.2f}║
║  Worst Trade:     ${p['worst_trade']:<21,.2f}║
╚══════════════════════════════════════════╝
""")


# ─────────────────────────────────────────────
# FLASK API (called by Next.js)
# ─────────────────────────────────────────────

def start_backtest_server(port: int = 5002):
    from flask import Flask, request, jsonify
    from flask_cors import CORS

    app = Flask(__name__)
    CORS(app)

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'engine': 'FLOW Backtest v1.0'})

    @app.route('/backtest/run', methods=['POST'])
    def run_backtest():
        try:
            body = request.get_json()
            symbol  = body.get('symbol', 'BTCUSDT')
            type_   = body.get('type', 'crypto')
            config  = body.get('config', {})

            backtester = FlowBacktester(
                initial_capital=config.get('initial_capital', 10000),
                position_size_pct=config.get('position_size_pct', 0.10),
                stop_loss_pct=config.get('stop_loss_pct', 0.02),
                take_profit_pct=config.get('take_profit_pct', 0.04),
                lookback=config.get('lookback', 50),
                signal_threshold=config.get('signal_threshold', 0.65),
                commission_pct=config.get('commission_pct', 0.001),
            )

            # Fetch data
            try:
                if type_ == 'crypto':
                    df = fetch_bitget_history(symbol, granularity='1H', limit=500)
                else:
                    df = fetch_yahoo_history(symbol, interval='1h', period='1y')
            except Exception:
                df = generate_mock_data(500)

            report = backtester.run(df, symbol=symbol)

            # Trim for API response size
            report['signal_history'] = report['signal_history'][-100:]
            report['equity_curve'] = report['equity_curve'][::5]  # Every 5th point

            return jsonify({'success': True, 'report': report})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    print(f'\n📊 FLOW Backtest Server running on http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=False)


# ─────────────────────────────────────────────
# CLI ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='FLOW Backtest Engine')
    parser.add_argument('--symbol', default='BTCUSDT')
    parser.add_argument('--type', default='crypto', choices=['crypto', 'stock'])
    parser.add_argument('--capital', type=float, default=10000.0)
    parser.add_argument('--lookback', type=int, default=50)
    parser.add_argument('--threshold', type=float, default=0.65)
    parser.add_argument('--serve', action='store_true')
    parser.add_argument('--port', type=int, default=5002)
    parser.add_argument('--mock', action='store_true', help='Use mock data')
    parser.add_argument('--export', action='store_true', help='Export results to files')
    args = parser.parse_args()

    if args.serve:
        start_backtest_server(args.port)
    else:
        print(f'\n🪐 FLOW Backtest — {args.symbol}\n')

        backtester = FlowBacktester(
            initial_capital=args.capital,
            lookback=args.lookback,
            signal_threshold=args.threshold,
        )

        if args.mock:
            print('Using mock data...')
            df = generate_mock_data(500)
        else:
            print(f'Fetching {args.type} data for {args.symbol}...')
            try:
                if args.type == 'crypto':
                    df = fetch_bitget_history(args.symbol, granularity='1H', limit=500)
                else:
                    df = fetch_yahoo_history(args.symbol, interval='1h', period='1y')
                print(f'Fetched {len(df)} candles.')
            except Exception as e:
                print(f'Data fetch failed: {e}. Using mock data.')
                df = generate_mock_data(500)

        report = backtester.run(df, symbol=args.symbol)
        print_summary(report)

        if args.export:
            export_report(report)
