import asyncio
import time
from typing import Optional
from kiteconnect import KiteConnect
from database import AsyncSessionLocal
from models.db_models import ZerodhaSessionDB

_pending_zerodha_login: dict[str, str] = {}

class ZerodhaAuthManager:
    """Manage the Zerodha Kite Connect login flow and persisted access token."""

    async def prepare_login(self, api_key: str, api_secret: str) -> str:
        """Store temporary Kite app credentials and return the login URL."""
        global _pending_zerodha_login
        _pending_zerodha_login = {
            'api_key': api_key,
            'api_secret': api_secret,
            'started_at': int(time.time() * 1000),
        }
        kite = KiteConnect(api_key=api_key)
        return kite.login_url()

    async def complete_login(self, request_token: str) -> dict:
        """Exchange a request_token for an access token and persist the session."""
        global _pending_zerodha_login
        if not _pending_zerodha_login:
            raise RuntimeError("No Zerodha login session found. Start authentication again.")

        api_key = _pending_zerodha_login.get('api_key')
        api_secret = _pending_zerodha_login.get('api_secret')
        _pending_zerodha_login = {}

        if not api_key or not api_secret:
            raise RuntimeError("Zerodha login session is missing API credentials.")

        kite = KiteConnect(api_key=api_key)
        try:
            response = await asyncio.to_thread(kite.generate_session, request_token, api_secret)
        except Exception as exc:
            raise RuntimeError(f"Zerodha session exchange failed: {exc}")

        access_token = response.get('access_token')
        if not access_token:
            raise RuntimeError("Zerodha did not return an access token.")

        await self._save_session(api_key, access_token, response.get('login_time'))
        return {
            'api_key': api_key,
            'access_token': access_token,
            'login_time': response.get('login_time'),
            'user': response.get('user'),
        }

    async def _save_session(self, api_key: str, access_token: str, login_time: Optional[str]) -> None:
        now = int(time.time() * 1000)
        async with AsyncSessionLocal() as db:
            existing = await db.get(ZerodhaSessionDB, api_key)
            if existing:
                existing.access_token = access_token
                existing.login_time = login_time
                existing.updated_at = now
            else:
                db.add(ZerodhaSessionDB(
                    api_key=api_key,
                    access_token=access_token,
                    login_time=login_time,
                    created_at=now,
                    updated_at=now,
                ))
            await db.commit()

    async def get_saved_session(self) -> Optional[dict]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                "SELECT api_key, access_token, login_time FROM zerodha_sessions ORDER BY updated_at DESC LIMIT 1"
            )
            row = result.first()
            if not row:
                return None
            return {
                'api_key': row[0],
                'access_token': row[1],
                'login_time': row[2],
            }

zerodha_auth = ZerodhaAuthManager()
