"""Ethereum event log indexer for cross-chain swap detection."""

import logging
import os
from asyncio import sleep
from datetime import datetime

import httpx

from .base import BaseIndexer, IndexedEvent

logger = logging.getLogger(__name__)


class EthereumIndexer(BaseIndexer):
    """Indexes Ethereum contract events relevant to ChainBridge swaps."""

    def __init__(self):
        super().__init__(chain="ethereum")
        self.rpc_url = os.getenv(
            "ETHEREUM_RPC_URL", "https://eth-sepolia.g.alchemy.com/v2/demo"
        )
        self.contract_address = os.getenv("ETHEREUM_BRIDGE_CONTRACT", "")
        self.confirmations = int(os.getenv("ETHEREUM_CONFIRMATIONS", "12"))
        self.max_retries = int(os.getenv("ETHEREUM_RPC_RETRIES", "3"))
        self._last_block_hash: str | None = None

    async def _rpc_call(self, method: str, params: list = None) -> dict:
        """Make a JSON-RPC call to the Ethereum node."""
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        self.rpc_url,
                        json={
                            "jsonrpc": "2.0",
                            "id": 1,
                            "method": method,
                            "params": params or [],
                        },
                        timeout=30,
                    )
                    response.raise_for_status()
                    data = response.json()
                    if "error" in data and data["error"]:
                        raise RuntimeError(f"Ethereum RPC error: {data['error']}")
                    return data.get("result")
            except Exception as exc:
                last_error = exc
                if attempt == self.max_retries:
                    break
                await sleep(attempt)
        raise RuntimeError("Ethereum RPC call failed") from last_error

    async def get_latest_block(self) -> int:
        try:
            result = await self._rpc_call("eth_blockNumber")
            latest = int(result, 16)
            return max(0, latest - self.confirmations)
        except Exception as e:
            logger.error("[ethereum] Failed to get block number: %s", e)
            raise

    async def fetch_events(self, from_block: int, to_block: int) -> list[IndexedEvent]:
        if not self.contract_address:
            return []

        await self.detect_reorg(from_block)
        events = []
        try:
            logs = await self._rpc_call(
                "eth_getLogs",
                [
                    {
                        "fromBlock": hex(from_block),
                        "toBlock": hex(to_block),
                        "address": self.contract_address,
                    }
                ],
            )

            for log in logs or []:
                try:
                    block_num = int(log["blockNumber"], 16)
                    block_data = await self._rpc_call(
                        "eth_getBlockByNumber",
                        [log["blockNumber"], False],
                    )
                    self._last_block_hash = (
                        block_data.get("hash") if block_data else None
                    )
                    events.append(
                        IndexedEvent(
                            chain="ethereum",
                            event_type=(
                                log["topics"][0] if log.get("topics") else "unknown"
                            ),
                            tx_hash=log.get("transactionHash", ""),
                            block_number=block_num,
                            contract_address=log.get("address"),
                            data={
                                "topics": log.get("topics", []),
                                "data": log.get("data", "0x"),
                                "log_index": int(log.get("logIndex", "0x0"), 16),
                            },
                            timestamp=datetime.utcnow(),
                        )
                    )
                except Exception as e:
                    logger.warning("[ethereum] Failed to parse log: %s", e)

        except Exception as e:
            logger.error("[ethereum] Failed to fetch logs: %s", e)
            raise

        return events

    async def handle_reorg(self, reorg_block: int) -> None:
        logger.warning(
            "[ethereum] Reorg detected at block %d. Rolling back indexed events.",
            reorg_block,
        )
        # In production: delete indexed events >= reorg_block from DB

    async def detect_reorg(self, from_block: int) -> None:
        if from_block <= 0 or not self._last_block_hash:
            return
        previous_block = await self._rpc_call(
            "eth_getBlockByNumber", [hex(from_block - 1), False]
        )
        if previous_block and previous_block.get("hash") != self._last_block_hash:
            await self.handle_reorg(from_block - 1)

    async def get_mempool_transactions(self) -> list[str]:
        txpool = await self._rpc_call("txpool_content")
        if not isinstance(txpool, dict):
            return []
        pending = txpool.get("pending", {})
        return list(pending.keys())

    async def broadcast_transaction(self, raw_tx: str) -> str:
        tx_hash = await self._rpc_call("eth_sendRawTransaction", [raw_tx])
        return str(tx_hash)
