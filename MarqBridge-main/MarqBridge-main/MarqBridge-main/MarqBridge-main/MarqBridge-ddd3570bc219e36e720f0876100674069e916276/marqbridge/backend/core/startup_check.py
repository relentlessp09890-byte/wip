import os
import sys
from dotenv import load_dotenv

load_dotenv()

REQUIRED_FOR_PRODUCTION = []
OPTIONAL_WITH_FALLBACK = [
    ('BINANCE_API_KEY',    'Binance integration disabled'),
    ('ANTHROPIC_API_KEY',  'AI news scoring will use heuristics'),
    ('NEWS_API_KEY',       'News feed will use mock data'),
]

def check_environment():
    warnings = []
    errors = []

    for key in REQUIRED_FOR_PRODUCTION:
        if not os.getenv(key):
            errors.append(f"MISSING REQUIRED: {key}")

    for key, fallback_msg in OPTIONAL_WITH_FALLBACK:
        if not os.getenv(key):
            warnings.append(f"[WARN] {key} not set — {fallback_msg}")

    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        sys.exit(1)

    for w in warnings:
        print(w)

    print("[MarqBridge] Environment check passed.")
