from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    PROJECT_NAME: str = "ClearPath Nexus Engine"

    POSTGRES_USER: str = "clearpath_user"
    POSTGRES_PASSWORD: str = "change_me"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "clearpath_nexus_db"
    DATABASE_URL: str = ""

    REDIS_HOST: str = "127.0.0.1"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    OPENWEATHER_API_KEY: str = ""
    NOAA_SPACE_WEATHER_FEED_URL: str = (
        "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
    )
    MARITIME_BERTH_DATA_FEED: str = "https://api.port-sync-mock.io/v1/schedules"

    WEIGHT_WEATHER_RISK: float = 0.40
    WEIGHT_PORT_ALIGNMENT: float = 0.30
    WEIGHT_CORRIDOR_CONGESTION: float = 0.15
    WEIGHT_HISTORICAL_DELAY: float = 0.15

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.0.2.2:8000",
    ]


settings = Settings()

if not settings.DATABASE_URL:
    settings.DATABASE_URL = (
        f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )
