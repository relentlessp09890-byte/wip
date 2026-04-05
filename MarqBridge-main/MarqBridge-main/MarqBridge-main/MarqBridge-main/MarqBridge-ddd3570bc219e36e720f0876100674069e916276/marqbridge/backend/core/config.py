from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    binance_api_key: str = ""
    binance_api_secret: str = ""
    bybit_api_key: str = ""
    bybit_api_secret: str = ""
    okx_api_key: str = ""
    okx_api_secret: str = ""
    anthropic_api_key: str = ""
    news_api_key: str = ""
    cryptopanic_api_key: str = ""
    backend_port: int = 8000
    ws_port: int = 8001
    environment: str = "development"
    stripe_secret_key: str = ""
    stripe_price_pro: str = ""
    stripe_price_prop: str = ""
    stripe_webhook_secret: str = ""
    vite_supabase_url: str = ""
    vite_supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

settings = Settings()
