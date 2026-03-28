"""Stellar/Soroban contract event indexer."""

import logging
import os
from datetime import datetime

from stellar_sdk import SorobanServer
from stellar_sdk.exceptions import SdkError

from .base import BaseIndexer, IndexedEvent

logger = logging.getLogger(__name__)


class StellarIndexer(BaseIndexer):
    """Indexes events from ChainBridge Soroban contracts."""

    def __init__(self):
        super().__init__(chain="stellar")
        rpc_url = os.getenv("SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org")
        self.server = SorobanServer(rpc_url)
        self.contract_id = os.getenv("CHAINBRIDGE_CONTRACT_ID", "")

    async def get_latest_block(self) -> int:
        try:
            response = self.server.get_latest_ledger()
            return response.sequence
        except SdkError as e:
            logger.error("[stellar] Failed to get latest ledger: %s", e)
            raise

    async def fetch_events(self, from_block: int, to_block: int) -> list[IndexedEvent]:
        events = []
        try:
            response = self.server.get_events(
                start_ledger=from_block,
                filters=(
                    [
                        {
                            "type": "contract",
                            "contractIds": [self.contract_id],
                        }
                    ]
                    if self.contract_id
                    else []
                ),
                limit=200,
            )

            for event in response.events:
                if hasattr(event, "ledger") and event.ledger > to_block:
                    break

                try:
                    indexed = IndexedEvent(
                        chain="stellar",
                        event_type=str(event.topic[0]) if event.topic else "unknown",
                        tx_hash=event.tx_hash if hasattr(event, "tx_hash") else "",
                        block_number=event.ledger,
                        contract_address=getattr(event, "contract_id", None),
                        data={
                            "topic": [str(t) for t in event.topic],
                            "value": str(event.value) if event.value else None,
                        },
                        timestamp=datetime.utcnow(),
                    )
                    events.append(indexed)
                except Exception as e:
                    logger.warning("[stellar] Failed to parse event: %s", e)

        except SdkError as e:
            logger.error("[stellar] Failed to fetch events: %s", e)
            raise

        return events

    async def handle_reorg(self, reorg_block: int) -> None:
        # Stellar/Soroban doesn't have traditional reorgs like PoW chains.
        # Ledger finality is near-instant. Log and continue.
        logger.info(
            "[stellar] Reorg handling not needed (instant finality), ledger %d",
            reorg_block,
        )
