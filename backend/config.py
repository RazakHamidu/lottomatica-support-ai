import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.0-flash"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
TOP_K_RESULTS = 4
