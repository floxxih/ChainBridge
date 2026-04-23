from fastapi import APIRouter
from .htlc import router as htlc_router
from .orders import router as orders_router
from .swaps import router as swaps_router
from .auth import router as auth_router
from .analytics import router as analytics_router
from .admin import router as admin_router
from .disputes import router as disputes_router
from .timelock import router as timelock_router
from .fees import router as fees_router
from .users import router as users_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(htlc_router, prefix="/htlcs", tags=["HTLCs"])
api_router.include_router(orders_router, prefix="/orders", tags=["Orders"])
api_router.include_router(swaps_router, prefix="/swaps", tags=["Swaps"])
api_router.include_router(disputes_router, prefix="/disputes", tags=["Disputes"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_router.include_router(timelock_router, prefix="/timelock", tags=["Timelock"])
api_router.include_router(fees_router, prefix="/market", tags=["Market Data"])
api_router.include_router(users_router, tags=["Users"])
