"""ChainBridge Python SDK.

Official client for the ChainBridge cross-chain atomic swap API.
"""

from .client import ChainBridgeClient, AsyncChainBridgeClient
from .errors import (
    ChainBridgeError,
    AuthenticationError,
    NetworkError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)
from .crypto import (
    generate_secret,
    derive_hash_lock,
    verify_secret,
    expiry_from_now,
    recommended_timelocks,
)
from .types import (
    Chain,
    Order,
    Htlc,
    Swap,
    Asset,
    FeeBreakdown,
    FeeEstimate,
    VolumeStats,
    SuccessRateStats,
)
from .websocket import ChainBridgeWebSocket

__version__ = "0.1.0"
__all__ = [
    "__version__",
    "ChainBridgeClient",
    "AsyncChainBridgeClient",
    "ChainBridgeWebSocket",
    "ChainBridgeError",
    "AuthenticationError",
    "NetworkError",
    "NotFoundError",
    "RateLimitError",
    "ValidationError",
    "generate_secret",
    "derive_hash_lock",
    "verify_secret",
    "expiry_from_now",
    "recommended_timelocks",
    "Chain",
    "Order",
    "Htlc",
    "Swap",
    "Asset",
    "FeeBreakdown",
    "FeeEstimate",
    "VolumeStats",
    "SuccessRateStats",
]
