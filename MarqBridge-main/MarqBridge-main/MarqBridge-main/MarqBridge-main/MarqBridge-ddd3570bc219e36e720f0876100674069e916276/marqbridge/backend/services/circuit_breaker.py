import time
from typing import List

class CircuitBreaker:
    def __init__(self):
        self.locked: bool = False
        self.lock_reason: str = ""
        self.locked_at: int | None = None
        self.session_trades: List[dict] = []
        self.daily_loss: float = 0.0

    def record_trade(self, pnl: float, gate_overridden: bool):
        self.session_trades.append({
            "pnl": pnl,
            "gate_overridden": gate_overridden,
            "ts": int(time.time() * 1000),
        })
        self.daily_loss += min(pnl, 0)
        self._evaluate()

    def _evaluate(self):
        trades = self.session_trades

        if len(trades) >= 3:
            last_3 = [t["pnl"] for t in trades[-3:]]
            if all(p < 0 for p in last_3):
                self._lock("3 consecutive losses detected. Session locked to protect capital.")
                return

        if self.daily_loss < -1000:
            self._lock(f"Daily loss limit reached (${abs(self.daily_loss):.2f}). Session locked until reset.")
            return

        overrides = [t for t in trades if t.get("gate_overridden")]
        if len(overrides) >= 2:
            self._lock("Multiple risk gate overrides detected. Tilt pattern confirmed — session locked.")
            return

    def _lock(self, reason: str):
        if not self.locked:
            self.locked = True
            self.lock_reason = reason
            self.locked_at = int(time.time() * 1000)

    def unlock(self, confirmation_code: str) -> bool:
        if confirmation_code == "OVERRIDE-MARQ":
            self.locked = False
            self.lock_reason = ""
            self.locked_at = None
            self.session_trades = []
            self.daily_loss = 0.0
            return True
        return False

    def reset_session(self):
        self.session_trades = []
        self.daily_loss = 0.0
        if self.locked:
            self.locked = False
            self.lock_reason = ""
            self.locked_at = None

    def state(self) -> dict:
        return {
            "locked": self.locked,
            "reason": self.lock_reason,
            "locked_at": self.locked_at,
            "session_trades": len(self.session_trades),
            "daily_loss": round(self.daily_loss, 2),
        }

circuit_breaker = CircuitBreaker()
