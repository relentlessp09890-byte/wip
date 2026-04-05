import time
from typing import Optional

class StateCache:
    """
    In-memory cache for account state and positions.
    Prevents hammering the exchange API on every WS tick.
    Account state: 500ms TTL
    Positions: 2000ms TTL (positions change less often)
    """

    def __init__(self):
        self._account = None
        self._positions = None
        self._account_ts = 0
        self._position_ts = 0
        self.ACCOUNT_TTL = 0.5  # 500ms
        self.POSITION_TTL = 2.0  # 2000ms

    def get_account(self):
        if time.time() - self._account_ts < self.ACCOUNT_TTL:
            return self._account
        return None

    def set_account(self, acc):
        self._account = acc
        self._account_ts = time.time()

    def get_positions(self):
        if time.time() - self._position_ts < self.POSITION_TTL:
            return self._positions
        return None

    def set_positions(self, pos):
        self._positions = pos
        self._position_ts = time.time()

    def invalidate(self):
        self._account_ts = 0
        self._position_ts = 0


state_cache = StateCache()
