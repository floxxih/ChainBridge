import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_user_creation_and_preferences():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Create user
        response = await ac.post("/users", json={
            "wallet_address": "0xABCDEF",
            "display_name": "Test User",
            "theme": "light",
            "notifications_enabled": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["wallet_address"] == "0xABCDEF"
        assert data["theme"] == "light"
        
        # Get user
        response = await ac.get("/users/0xABCDEF")
        assert response.status_code == 200
        assert response.json()["display_name"] == "Test User"
