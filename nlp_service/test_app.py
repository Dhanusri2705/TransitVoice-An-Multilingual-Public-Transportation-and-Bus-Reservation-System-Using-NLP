import sys
from pathlib import Path

CURRENT_DIR = str(Path(__file__).resolve().parent)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import app
print("SUCCESS: app.py imported without errors!")
