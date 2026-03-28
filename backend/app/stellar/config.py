"""Stellar network configuration for testnet and mainnet."""

import os
from dataclasses import dataclass
from stellar_sdk import Network


@dataclass
class StellarConfig:
    """Configuration for Stellar/Soroban connectivity."""

    soroban_rpc_url: str
    horizon_url: str
    network_passphrase: str
    contract_id: str

    @classmethod
    def from_env(cls) -> "StellarConfig":
        """Load configuration from environment variables."""
        network = os.getenv("STELLAR_NETWORK", "testnet")

        if network == "mainnet":
            passphrase = Network.PUBLIC_NETWORK_PASSPHRASE
            default_horizon = "https://horizon.stellar.org"
            default_rpc = "https://soroban-rpc.mainnet.stellar.gateway.fm"
        else:
            passphrase = Network.TESTNET_NETWORK_PASSPHRASE
            default_horizon = "https://horizon-testnet.stellar.org"
            default_rpc = "https://soroban-testnet.stellar.org"

        return cls(
            soroban_rpc_url=os.getenv("SOROBAN_RPC_URL", default_rpc),
            horizon_url=os.getenv("HORIZON_URL", default_horizon),
            network_passphrase=os.getenv("NETWORK_PASSPHRASE", passphrase),
            contract_id=os.getenv("CHAINBRIDGE_CONTRACT_ID", ""),
        )
