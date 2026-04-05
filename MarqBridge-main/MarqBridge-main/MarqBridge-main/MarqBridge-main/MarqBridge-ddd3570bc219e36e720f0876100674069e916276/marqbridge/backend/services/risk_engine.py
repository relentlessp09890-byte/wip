from models.schemas import AccountState, Position, RiskLevel
from typing import List, Dict
import time


class RiskEngine:
    """
    Core risk calculation engine.
    All calculations run on broker-sourced data only.
    No external price feeds. No predictions. Only state analysis.
    """

    # ── Multi-axis risk score ──────────────────────────────────────

    def score(self, account: AccountState, positions: List[Position]) -> Dict:
        """
        Returns a structured risk score across 3 axes.
        Each axis 0-100. Overall is weighted composite.
        """
        margin_score = self._margin_axis(account)
        exposure_score = self._exposure_axis(positions)
        liq_score = self._liquidation_axis(account, positions)

        overall = round(
            margin_score * 0.40 +
            exposure_score * 0.35 +
            liq_score * 0.25
        )

        return {
            "overall": overall,
            "axes": {
                "margin": round(margin_score),
                "exposure": round(exposure_score),
                "liquidation": round(liq_score),
            },
            "level": self._score_to_level(overall),
            "heat": self._score_to_heat(overall),
            "ts": int(time.time() * 1000),
        }

    def _margin_axis(self, account: AccountState) -> float:
        ml = account.margin_level
        if ml <= 0:
            return 0.0
        if ml >= 500:
            return 0.0
        if ml >= 300:
            return 10.0
        if ml >= 200:
            return 25.0
        if ml >= 150:
            return 45.0
        if ml >= 120:
            return 65.0
        if ml >= 110:
            return 80.0
        return 95.0

    def _exposure_axis(self, positions: List[Position]) -> float:
        if not positions:
            return 0.0
        total_margin = sum(p.margin_used for p in positions)
        if total_margin <= 0:
            return 0.0

        largest = max(p.margin_used for p in positions)
        concentration = largest / total_margin * 100

        if concentration >= 80:
            return 85.0
        if concentration >= 60:
            return 65.0
        if concentration >= 40:
            return 45.0
        if concentration >= 25:
            return 25.0
        return 10.0

    def _liquidation_axis(self, account: AccountState, positions: List[Position]) -> float:
        if not positions:
            return 0.0

        min_dist = min(
            (p.distance_to_liq for p in positions if p.distance_to_liq < 999),
            default=999.0
        )

        if min_dist >= 50:
            return 5.0
        if min_dist >= 30:
            return 20.0
        if min_dist >= 15:
            return 45.0
        if min_dist >= 10:
            return 65.0
        if min_dist >= 5:
            return 85.0
        return 99.0

    def _score_to_level(self, score: float) -> str:
        if score < 25:
            return "SAFE"
        if score < 50:
            return "WARNING"
        if score < 75:
            return "DANGER"
        return "CRITICAL"

    def _score_to_heat(self, score: float) -> str:
        if score < 20:
            return "NORMAL"
        if score < 45:
            return "ELEVATED"
        if score < 70:
            return "HIGH"
        return "EXTREME"

    # ── Margin stress test ─────────────────────────────────────────

    def stress_test(self, account: AccountState, positions: List[Position], shock_pct: float) -> Dict:
        """
        Simulates a price shock across all open positions.
        Returns projected equity, margin level, and which positions
        would be liquidated.
        """
        if not positions:
            return {
                "shock_pct": shock_pct,
                "projected_equity": account.equity,
                "projected_margin_level": account.margin_level,
                "projected_pnl_change": 0.0,
                "liquidations_at_risk": [],
                "survivable": True,
            }

        multiplier = shock_pct / 100.0
        total_pnl_change = 0.0
        liquidations = []

        for pos in positions:
            if pos.current_price <= 0:
                continue
            price_change = pos.current_price * multiplier
            if pos.side.value == "LONG":
                pnl_change = price_change * pos.size
            else:
                pnl_change = -price_change * pos.size

            total_pnl_change += pnl_change
            projected_price = pos.current_price + price_change

            if pos.liquidation_price > 0:
                if pos.side.value == "LONG" and projected_price <= pos.liquidation_price:
                    liquidations.append({
                        "ticker": pos.ticker,
                        "side": pos.side.value,
                        "current_price": round(pos.current_price, 4),
                        "projected_price": round(projected_price, 4),
                        "liquidation_price": round(pos.liquidation_price, 4),
                    })
                elif pos.side.value == "SHORT" and projected_price >= pos.liquidation_price:
                    liquidations.append({
                        "ticker": pos.ticker,
                        "side": pos.side.value,
                        "current_price": round(pos.current_price, 4),
                        "projected_price": round(projected_price, 4),
                        "liquidation_price": round(pos.liquidation_price, 4),
                    })

        projected_equity = account.equity + total_pnl_change
        projected_margin_level = (
            projected_equity / account.used_margin * 100
            if account.used_margin > 0 else 999.0
        )

        return {
            "shock_pct": shock_pct,
            "projected_equity": round(projected_equity, 2),
            "projected_margin_level": round(projected_margin_level, 2),
            "projected_pnl_change": round(total_pnl_change, 2),
            "liquidations_at_risk": liquidations,
            "survivable": len(liquidations) == 0 and projected_equity > 0,
        }

    # ── Tactical simulator ─────────────────────────────────────────

    def simulate_trade(
        self,
        account: AccountState,
        positions: List[Position],
        ticker: str,
        side: str,
        size: float,
        entry_price: float,
        leverage: float = 1.0,
    ) -> Dict:
        """
        Pre-trade risk simulation.
        Shows margin impact, projected risk score, and go/no-go.
        """
        notional = size * entry_price
        margin_required = notional / leverage if leverage > 0 else notional
        new_used_margin = account.used_margin + margin_required
        new_margin_level = (
            account.equity / new_used_margin * 100
            if new_used_margin > 0 else 999.0
        )
        new_free_margin = account.equity - new_used_margin
        margin_impact_pct = (
            margin_required / account.equity * 100
            if account.equity > 0 else 0.0
        )

        if leverage > 0 and entry_price > 0:
            if side.upper() == "LONG":
                liq_est = entry_price * (1 - 1 / leverage * 0.9)
            else:
                liq_est = entry_price * (1 + 1 / leverage * 0.9)
        else:
            liq_est = 0.0

        new_account = AccountState(
            equity=account.equity,
            balance=account.balance,
            margin_level=new_margin_level,
            free_margin=max(0, new_free_margin),
            used_margin=new_used_margin,
            liquidation_proximity=max(
                0, round(100 - new_margin_level, 2)
            ) if new_margin_level < 100 else 0.0,
            risk_level=RiskLevel.SAFE,
            heat="NORMAL",
            last_updated=int(time.time() * 1000),
        )

        projected_score = self.score(new_account, positions)
        current_score = self.score(account, positions)

        can_execute = (
            new_free_margin >= 0 and
            new_margin_level >= 110 and
            margin_impact_pct <= 50
        )

        gate_reason = None
        if new_free_margin < 0:
            gate_reason = "Insufficient free margin for this position size."
        elif new_margin_level < 110:
            gate_reason = "Trade would bring margin level below 110% — critical zone."
        elif margin_impact_pct > 50:
            gate_reason = "Single trade exceeds 50% of available equity — overexposure."

        return {
            "ticker": ticker,
            "side": side.upper(),
            "size": size,
            "entry_price": round(entry_price, 6),
            "notional": round(notional, 2),
            "margin_required": round(margin_required, 2),
            "margin_impact_pct": round(margin_impact_pct, 2),
            "projected_margin_level": round(new_margin_level, 2),
            "projected_free_margin": round(new_free_margin, 2),
            "estimated_liquidation": round(liq_est, 6),
            "current_risk_score": current_score["overall"],
            "projected_risk_score": projected_score["overall"],
            "score_delta": projected_score["overall"] - current_score["overall"],
            "can_execute": can_execute,
            "gate_reason": gate_reason,
        }

    # ── Session heat score ─────────────────────────────────────────

    def session_heat(self, decisions_today: list) -> Dict:
        """
        Scores trader's psychological state within the current session.
        Rises with each impulsive or losing trade pattern.
        """
        if not decisions_today:
            return {"score": 0, "level": "NORMAL", "flags": []}

        flags = []
        score = 0

        losses = [d for d in decisions_today if (d.get("pnl") or 0) < 0]
        if len(losses) >= 3:
            score += 30
            flags.append("3+ consecutive losing trades this session")
        elif len(losses) >= 2:
            score += 15
            flags.append("2 consecutive losses detected")

        if len(decisions_today) >= 10:
            score += 25
            flags.append("High trade frequency — possible overtrading")
        elif len(decisions_today) >= 6:
            score += 10

        overrides = [d for d in decisions_today if d.get("gate_overridden")]
        if len(overrides) >= 2:
            score += 30
            flags.append("Multiple risk gate overrides this session")
        elif len(overrides) == 1:
            score += 15
            flags.append("Risk gate overridden once this session")

        if len(decisions_today) >= 2:
            last_two = decisions_today[-2:]
            if (last_two[0].get("pnl") or 0) > 0 and (last_two[1].get("pnl") or 0) < 0:
                score += 10
                flags.append("Loss immediately after a win — tilt pattern")

        score = min(score, 100)

        level = "NORMAL" if score < 25 else \
                "ELEVATED" if score < 50 else \
                "HIGH" if score < 75 else "EXTREME"

        return {"score": score, "level": level, "flags": flags}


risk_engine = RiskEngine()
