import os
from dotenv import load_dotenv

# Load env variables from root of ai-service
load_dotenv()

class Settings:
    PROJECT_NAME: str = "IntelliDoc AI Service"
    PORT: int = int(os.getenv("PORT", 8000))
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", "./chroma_db")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./models")
    
    # Generic OpenAI-compatible LLM settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")

settings = Settings()
