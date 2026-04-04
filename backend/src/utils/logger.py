from __future__ import annotations

import sys

from loguru import logger

from src.config.env import env

# Remove default handler
logger.remove()

# Console handler with pretty formatting
log_level = "DEBUG" if env.NODE_ENV != "production" else "INFO"
logger.add(
    sys.stderr,
    level=log_level,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    colorize=True,
)

__all__ = ["logger"]
