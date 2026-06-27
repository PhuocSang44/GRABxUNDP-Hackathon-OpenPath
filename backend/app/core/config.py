from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    supabase_url: str = ""
    supabase_key: str = ""
    jwt_secret_key: str = "dev-secret-change-in-production"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
