import os
import sys
import pytest

# Ensure backend root is in sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Set test environment
os.environ["DEBUG"] = "true"
os.environ["GEMINI_API_KEY"] = "" # Use mock/simulation mode in tests
