from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.config.redis import close_redis, get_redis, init_redis
from app.indexer import IndexerManager
from app.middleware.metrics import MetricsMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.observability.metrics import update_indexer_metrics
from app.routes import api_router
from app.routes.ws import router as ws_router
from app.stellar import StellarClient, StellarConfig
from app.ws.manager import ConnectionManager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    # Initialize and start WebSocket manager
    app.state.ws_manager = ConnectionManager(get_redis())
    app.state.ws_manager.start()
    app.state.indexer_manager = None
    if os.getenv("CHAINBRIDGE_ENABLE_INDEXERS", "true").lower() == "true":
        app.state.indexer_manager = IndexerManager()
        try:
            await app.state.indexer_manager.start_all()
        except Exception as exc:
            logger.warning("Failed to start indexer manager: %s", exc)
    yield
    # Stop WebSocket manager
    if app.state.indexer_manager:
        await app.state.indexer_manager.stop_all()
    await app.state.ws_manager.stop()
    await close_redis()


app = FastAPI(
    title="ChainBridge API",
    description="Backend API for ChainBridge cross-chain atomic swaps",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(MetricsMiddleware)

app.include_router(api_router)
app.include_router(ws_router, prefix="/api/v1", tags=["WebSocket"])

# Initialize Stellar client
stellar_config = StellarConfig.from_env()
stellar_client = StellarClient(stellar_config)


@app.get("/")
async def root():
    return {"name": "ChainBridge API", "version": "0.1.0", "status": "running"}


@app.get("/health")
async def health_check():
    stellar_health = await stellar_client.health_check()
    return {
        "status": "healthy",
        "stellar": stellar_health,
    }


@app.get("/metrics", include_in_schema=False)
async def metrics():
    if app.state.indexer_manager:
        update_indexer_metrics(app.state.indexer_manager.get_all_status())
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/stellar/latest-ledger")
async def latest_ledger():
    ledger = await stellar_client.get_latest_ledger()
    return {"latest_ledger": ledger}


@app.get("/stellar/events")
async def contract_events(start_ledger: int, limit: int = 100):
    events = await stellar_client.get_contract_events(start_ledger, limit)
    return {"events": events, "count": len(events)}


@app.get("/stellar/transaction/{tx_hash}")
async def transaction_status(tx_hash: str):
    status = await stellar_client.get_transaction_status(tx_hash)
    return status


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
