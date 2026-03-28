"""Timelock validation and safety checks for HTLC contracts (#56)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class TimelockWarningLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class TimelockWarning:
    level: TimelockWarningLevel
    message: str
    recommendation: Optional[str] = None


@dataclass
class TimelockValidationResult:
    valid: bool
    warnings: list[TimelockWarning]
    recommended_duration: Optional[int] = None
    adjusted_timelock: Optional[int] = None

    def to_dict(self) -> dict:
        return {
            "valid": self.valid,
            "warnings": [
                {
                    "level": w.level.value,
                    "message": w.message,
                    "recommendation": w.recommendation,
                }
                for w in self.warnings
            ],
            "recommended_duration": self.recommended_duration,
            "adjusted_timelock": self.adjusted_timelock,
        }


# Timelock duration bounds in seconds
MIN_TIMELOCK_DURATION = 3600  # 1 hour
MAX_TIMELOCK_DURATION = 604800  # 7 days
OPTIMAL_MIN_DURATION = 7200  # 2 hours
OPTIMAL_MAX_DURATION = 259200  # 3 days

# Chain-specific recommended timelocks in seconds
CHAIN_TIMELOCK_RECOMMENDATIONS: dict[str, dict] = {
    "stellar": {
        "min_duration": 3600,
        "recommended_duration": 14400,  # 4 hours
        "max_duration": 604800,
        "avg_confirmation_time": 5,
        "description": "Stellar has ~5s finality; shorter timelocks are safe.",
    },
    "bitcoin": {
        "min_duration": 7200,
        "recommended_duration": 86400,  # 24 hours
        "max_duration": 604800,
        "avg_confirmation_time": 600,
        "description": "Bitcoin blocks average ~10min; longer timelocks recommended.",
    },
    "ethereum": {
        "min_duration": 3600,
        "recommended_duration": 28800,  # 8 hours
        "max_duration": 604800,
        "avg_confirmation_time": 12,
        "description": "Ethereum has ~12s block time; moderate timelocks work well.",
    },
    "solana": {
        "min_duration": 3600,
        "recommended_duration": 14400,  # 4 hours
        "max_duration": 604800,
        "avg_confirmation_time": 1,
        "description": "Solana has ~400ms slots; short timelocks are fine.",
    },
}


class TimelockValidationService:
    """Validates timelock durations and provides safety warnings."""

    def validate_timelock(
        self,
        time_lock: int,
        source_chain: Optional[str] = None,
        dest_chain: Optional[str] = None,
    ) -> TimelockValidationResult:
        now_ts = int(datetime.now(timezone.utc).timestamp())
        warnings: list[TimelockWarning] = []
        valid = True

        # Reject timelocks in the past
        if time_lock <= now_ts:
            warnings.append(
                TimelockWarning(
                    level=TimelockWarningLevel.ERROR,
                    message="Timelock is in the past.",
                    recommendation="Set timelock to a future timestamp.",
                )
            )
            valid = False

        duration = time_lock - now_ts

        # Reject below minimum
        if valid and duration < MIN_TIMELOCK_DURATION:
            warnings.append(
                TimelockWarning(
                    level=TimelockWarningLevel.ERROR,
                    message=(
                        f"Timelock duration ({duration}s) is below the minimum "
                        f"of {MIN_TIMELOCK_DURATION}s (1 hour)."
                    ),
                    recommendation=(
                        "Increase the timelock to at least 1 hour from now."
                    ),
                )
            )
            valid = False

        # Reject above maximum
        if valid and duration > MAX_TIMELOCK_DURATION:
            warnings.append(
                TimelockWarning(
                    level=TimelockWarningLevel.ERROR,
                    message=(
                        f"Timelock duration ({duration}s) exceeds the maximum "
                        f"of {MAX_TIMELOCK_DURATION}s (7 days)."
                    ),
                    recommendation="Reduce the timelock to at most 7 days from now.",
                )
            )
            valid = False

        # Warn if duration is short but still above minimum
        if valid and duration < OPTIMAL_MIN_DURATION:
            warnings.append(
                TimelockWarning(
                    level=TimelockWarningLevel.WARNING,
                    message=(
                        f"Timelock duration ({duration}s) is relatively short. "
                        "This may not leave enough time for the counterparty."
                    ),
                    recommendation=("Consider using at least 2 hours for safer swaps."),
                )
            )

        # Warn if duration is unusually long
        if valid and duration > OPTIMAL_MAX_DURATION:
            warnings.append(
                TimelockWarning(
                    level=TimelockWarningLevel.WARNING,
                    message=(
                        f"Timelock duration ({duration}s) is unusually long. "
                        "Funds will be locked for an extended period."
                    ),
                    recommendation=(
                        "Consider reducing the timelock to 3 days or less."
                    ),
                )
            )

        # Chain-specific recommendations
        recommended = self._get_recommended_duration(source_chain, dest_chain)
        adjusted = None
        if not valid and duration < MIN_TIMELOCK_DURATION:
            adjusted = now_ts + recommended

        if valid and source_chain:
            chain_rec = CHAIN_TIMELOCK_RECOMMENDATIONS.get(source_chain.lower())
            if chain_rec and duration < chain_rec["min_duration"]:
                warnings.append(
                    TimelockWarning(
                        level=TimelockWarningLevel.WARNING,
                        message=(
                            f"Timelock is below the recommended minimum for "
                            f"{source_chain} ({chain_rec['min_duration']}s)."
                        ),
                        recommendation=(
                            f"Use at least {chain_rec['recommended_duration']}s "
                            f"for {source_chain} swaps."
                        ),
                    )
                )

        if valid and dest_chain:
            chain_rec = CHAIN_TIMELOCK_RECOMMENDATIONS.get(dest_chain.lower())
            if chain_rec and duration < chain_rec["min_duration"]:
                warnings.append(
                    TimelockWarning(
                        level=TimelockWarningLevel.WARNING,
                        message=(
                            f"Timelock is below the recommended minimum for "
                            f"{dest_chain} ({chain_rec['min_duration']}s)."
                        ),
                        recommendation=(
                            f"Use at least {chain_rec['recommended_duration']}s "
                            f"for {dest_chain} swaps."
                        ),
                    )
                )

        return TimelockValidationResult(
            valid=valid,
            warnings=warnings,
            recommended_duration=recommended,
            adjusted_timelock=adjusted,
        )

    def get_chain_recommendations(self, chain: Optional[str] = None) -> dict:
        if chain:
            rec = CHAIN_TIMELOCK_RECOMMENDATIONS.get(chain.lower())
            if not rec:
                return {"error": f"No recommendations for chain '{chain}'."}
            return {chain.lower(): rec}
        return CHAIN_TIMELOCK_RECOMMENDATIONS

    def _get_recommended_duration(
        self,
        source_chain: Optional[str] = None,
        dest_chain: Optional[str] = None,
    ) -> int:
        durations = []
        for chain in [source_chain, dest_chain]:
            if chain:
                rec = CHAIN_TIMELOCK_RECOMMENDATIONS.get(chain.lower())
                if rec:
                    durations.append(rec["recommended_duration"])
        return max(durations) if durations else OPTIMAL_MIN_DURATION
