"""Bitcoin transaction indexer for cross-chain swap detection."""

import logging
import os
from asyncio import sleep
from datetime import datetime

import httpx

from .base import BaseIndexer, IndexedEvent

logger = logging.getLogger(__name__)


class BitcoinIndexer(BaseIndexer):
    """Indexes Bitcoin transactions relevant to ChainBridge swaps."""

    def __init__(self):
        super().__init__(chain="bitcoin")
        self.rpc_url = os.getenv("BITCOIN_RPC_URL", "http://localhost:18332")
        self.rpc_user = os.getenv("BITCOIN_RPC_USER", "")
        self.rpc_password = os.getenv("BITCOIN_RPC_PASSWORD", "")
        self.confirmations = int(os.getenv("BITCOIN_CONFIRMATIONS", "6"))
        self.max_retries = int(os.getenv("BITCOIN_RPC_RETRIES", "3"))
        self._last_block_hash: str | None = None

    async def _rpc_call(self, method: str, params: list = None) -> dict:
        """Make a JSON-RPC call to the Bitcoin node."""
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
                        auth=(
                            (self.rpc_user, self.rpc_password)
                            if self.rpc_user
                            else None
                        ),
                        timeout=30,
                    )
                    response.raise_for_status()
                    data = response.json()
                    if "error" in data and data["error"]:
                        raise RuntimeError(f"Bitcoin RPC error: {data['error']}")
                    return data.get("result", {})
            except Exception as exc:
                last_error = exc
                if attempt == self.max_retries:
                    break
                await sleep(attempt)
        raise RuntimeError("Bitcoin RPC call failed") from last_error

    async def get_latest_block(self) -> int:
        try:
            count = await self._rpc_call("getblockcount")
            # Subtract confirmations for safety
            return max(0, int(count) - self.confirmations)
        except Exception as e:
            logger.error("[bitcoin] Failed to get block count: %s", e)
            raise

    async def fetch_events(self, from_block: int, to_block: int) -> list[IndexedEvent]:
        await self.detect_reorg(from_block)
        events = []
        for height in range(from_block, to_block + 1):
            try:
                block_hash = await self._rpc_call("getblockhash", [height])
                self._last_block_hash = block_hash
                block = await self._rpc_call("getblock", [block_hash, 2])

                for tx in block.get("tx", []):
                    # Look for OP_RETURN outputs containing ChainBridge markers
                    for vout in tx.get("vout", []):
                        script = vout.get("scriptPubKey", {})
                        asm = script.get("asm", "")
                        if "OP_RETURN" in asm and self._is_bridge_tx(asm):
                            events.append(
                                IndexedEvent(
                                    chain="bitcoin",
                                    event_type="bridge_deposit",
                                    tx_hash=tx["txid"],
                                    block_number=height,
                                    contract_address=None,
                                    data={
                                        "value": vout.get("value", 0),
                                        "op_return": asm,
                                    },
                                    timestamp=datetime.utcfromtimestamp(
                                        block.get("time", 0)
                                    ),
                                )
                            )
            except Exception as e:
                logger.warning("[bitcoin] Error processing block %d: %s", height, e)

        return events

    async def handle_reorg(self, reorg_block: int) -> None:
        logger.warning(
            "[bitcoin] Reorg detected at block %d. Rolling back indexed events.",
            reorg_block,
        )
        # In production: delete indexed events >= reorg_block from DB
        # and re-index from reorg_block

    async def detect_reorg(self, height: int) -> None:
        if height <= 0 or not self._last_block_hash:
            return
        current_hash = await self._rpc_call("getblockhash", [height - 1])
        if current_hash != self._last_block_hash:
            await self.handle_reorg(height - 1)

    async def get_mempool_transactions(self) -> list[str]:
        mempool = await self._rpc_call("getrawmempool")
        return list(mempool or [])

    async def broadcast_transaction(self, raw_tx: str) -> str:
        tx_hash = await self._rpc_call("sendrawtransaction", [raw_tx])
        return str(tx_hash)

    def _is_bridge_tx(self, asm: str) -> bool:
        """Check if an OP_RETURN contains a ChainBridge marker."""
        # ChainBridge transactions use a specific prefix in OP_RETURN
        return "chainbridge" in asm.lower() or "cb:" in asm.lower()
