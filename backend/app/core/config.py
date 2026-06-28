from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    supabase_url: str = ""
    supabase_key: str = ""
    jwt_secret_key: str = "dev-secret-change-in-production"
    google_maps_api_key: str = ""
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    mapillary_access_token: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
