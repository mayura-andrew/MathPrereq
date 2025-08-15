from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Keys
    openai_api_key: str = ""
    groq_api_key: Optional[str] = None
    
    # Database Configuration
    chroma_persist_directory: str = "./data/chroma_db"
    
    # Server Configuration
    backend_host: str = "localhost"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:5173"
    
    # Logging
    log_level: str = "INFO"
    
    # LLM Configuration
    default_llm_model: str = "gpt-4o-mini"
    max_tokens: int = 2000
    temperature: float = 0.1
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()