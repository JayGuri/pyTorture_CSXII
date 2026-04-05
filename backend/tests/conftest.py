from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.main import app


@pytest.fixture
def client():
    with patch("src.main.connect_db", new=AsyncMock()), patch("src.main.disconnect_db", new=AsyncMock()):
        with TestClient(app) as test_client:
            yield test_client
