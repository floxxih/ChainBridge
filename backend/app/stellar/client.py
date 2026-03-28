"""
Stellar SDK client for interacting with ChainBridge smart contracts.

Provides utilities for contract invocation, transaction signing/submission,
event parsing, and transaction status monitoring.

Usage:
    config = StellarConfig.from_env()
    client = StellarClient(config)

    # Invoke a contract function
    result = await client.invoke_contract("create_htlc", [param1, param2], keypair)

    # Monitor transaction status
    status = await client.get_transaction_status(tx_hash)

    # Parse contract events
    events = await client.get_contract_events(start_ledger=1000)
"""

import asyncio
import logging
from typing import Any

from stellar_sdk import (
    Keypair,
    Network,
    SorobanServer,
    TransactionBuilder,
    scval,
)
from stellar_sdk.exceptions import SdkError
from stellar_sdk.soroban_rpc import GetTransactionStatus

from .config import StellarConfig

logger = logging.getLogger(__name__)


class StellarClientError(Exception):
    """Base exception for Stellar client errors."""

    pass


class NetworkError(StellarClientError):
    """Raised when a network request fails after retries."""

    pass


class ContractError(StellarClientError):
    """Raised when a contract invocation fails."""

    pass


class StellarClient:
    """Client for interacting with Stellar/Soroban smart contracts."""

    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds
    TX_POLL_INTERVAL = 2  # seconds
    TX_POLL_TIMEOUT = 30  # seconds

    def __init__(self, config: StellarConfig):
        self.config = config
        self.server = SorobanServer(config.soroban_rpc_url)
        self._contract_id = config.contract_id

    # ── Contract Invocation ───────────────────────────────────────────────

    async def invoke_contract(
        self,
        function_name: str,
        args: list[Any],
        source_keypair: Keypair,
    ) -> Any:
        """
        Invoke a Soroban contract function.

        1. Build the transaction
        2. Simulate to get resource estimates
        3. Sign and submit
        4. Poll for confirmation

        Retries on transient network errors.
        """
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                return await self._invoke(function_name, args, source_keypair)
            except NetworkError:
                if attempt == self.MAX_RETRIES:
                    raise
                logger.warning(
                    "Attempt %d/%d failed for %s, retrying in %ds",
                    attempt,
                    self.MAX_RETRIES,
                    function_name,
                    self.RETRY_DELAY,
                )
                await asyncio.sleep(self.RETRY_DELAY * attempt)

    async def _invoke(
        self,
        function_name: str,
        args: list[Any],
        source_keypair: Keypair,
    ) -> Any:
        """Internal: single invocation attempt."""
        try:
            source_account = self.server.load_account(source_keypair.public_key)
        except SdkError as e:
            raise NetworkError(f"Failed to load account: {e}") from e

        try:
            builder = (
                TransactionBuilder(
                    source_account=source_account,
                    network_passphrase=self.config.network_passphrase,
                    base_fee=100,
                )
                .append_invoke_contract_function_op(
                    contract_id=self._contract_id,
                    function_name=function_name,
                    parameters=args,
                )
                .set_timeout(300)
                .build()
            )

            # Simulate to get resource estimates
            sim = self.server.simulate_transaction(builder)
            if sim.error:
                raise ContractError(
                    f"Simulation failed for {function_name}: {sim.error}"
                )

            # Prepare (attach resource info) and sign
            prepared = self.server.prepare_transaction(builder)
            prepared.sign(source_keypair)

            # Submit
            response = self.server.send_transaction(prepared)
            tx_hash = response.hash

            logger.info(
                "Transaction submitted: %s (function: %s)", tx_hash, function_name
            )

            # Poll for result
            result = await self._poll_transaction(tx_hash)
            return result

        except (ContractError, NetworkError):
            raise
        except SdkError as e:
            raise NetworkError(f"SDK error in {function_name}: {e}") from e
        except Exception as e:
            raise StellarClientError(f"Unexpected error in {function_name}: {e}") from e

    # ── Transaction Monitoring ────────────────────────────────────────────

    async def get_transaction_status(self, tx_hash: str) -> dict:
        """Get the current status of a transaction."""
        try:
            response = self.server.get_transaction(tx_hash)
            return {
                "hash": tx_hash,
                "status": response.status.value,
                "ledger": getattr(response, "ledger", None),
            }
        except SdkError as e:
            raise NetworkError(f"Failed to get transaction {tx_hash}: {e}") from e

    async def _poll_transaction(self, tx_hash: str) -> Any:
        """Poll until a transaction is confirmed or fails."""
        elapsed = 0
        while elapsed < self.TX_POLL_TIMEOUT:
            try:
                response = self.server.get_transaction(tx_hash)

                if response.status == GetTransactionStatus.SUCCESS:
                    logger.info("Transaction confirmed: %s", tx_hash)
                    return self._parse_result(response)

                if response.status == GetTransactionStatus.FAILED:
                    raise ContractError(f"Transaction {tx_hash} failed on-chain")

                # NOT_FOUND means still pending
            except SdkError as e:
                logger.warning("Poll error for %s: %s", tx_hash, e)

            await asyncio.sleep(self.TX_POLL_INTERVAL)
            elapsed += self.TX_POLL_INTERVAL

        raise NetworkError(
            f"Transaction {tx_hash} not confirmed within {self.TX_POLL_TIMEOUT}s"
        )

    # ── Event Parsing ─────────────────────────────────────────────────────

    async def get_contract_events(
        self,
        start_ledger: int,
        limit: int = 100,
    ) -> list[dict]:
        """
        Fetch contract events from the Soroban RPC.

        Returns parsed events with topic and data fields.
        """
        try:
            response = self.server.get_events(
                start_ledger=start_ledger,
                filters=[
                    {
                        "type": "contract",
                        "contractIds": [self._contract_id],
                    }
                ],
                limit=limit,
            )

            events = []
            for event in response.events:
                try:
                    parsed = {
                        "ledger": event.ledger,
                        "contract_id": event.contract_id,
                        "topic": [str(t) for t in event.topic],
                        "value": str(event.value) if event.value else None,
                        "tx_hash": event.tx_hash,
                    }
                    events.append(parsed)
                except Exception as e:
                    logger.warning("Failed to parse event: %s", e)
                    continue

            return events

        except SdkError as e:
            raise NetworkError(f"Failed to fetch events: {e}") from e

    # ── Helpers ───────────────────────────────────────────────────────────

    def _parse_result(self, response: Any) -> Any:
        """Extract the return value from a successful transaction."""
        if hasattr(response, "result_meta_xdr") and response.result_meta_xdr:
            try:
                return response.result_meta_xdr
            except Exception:
                pass
        return None

    async def get_latest_ledger(self) -> int:
        """Get the latest ledger sequence number."""
        try:
            response = self.server.get_latest_ledger()
            return response.sequence
        except SdkError as e:
            raise NetworkError(f"Failed to get latest ledger: {e}") from e

    async def health_check(self) -> dict:
        """Check Soroban RPC health."""
        try:
            response = self.server.get_health()
            return {"status": response.status, "rpc_url": self.config.soroban_rpc_url}
        except SdkError as e:
            return {"status": "unhealthy", "error": str(e)}
