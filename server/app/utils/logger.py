import logging
import sys
from app.config import settings

# Explicit rather than getattr(logging, name): the logging module holds plenty
# of non-level ints and bools (logging.raiseExceptions is True, and bool is an
# int), so a stray LOG_LEVEL could otherwise resolve to a nonsense threshold.
_LOG_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "WARN": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def setup_logger():
    # Previously `DEBUG if LOG_LEVEL == "debug" else INFO`, which quietly
    # collapsed "warning" and "error" into INFO — asking for less noise gave you
    # exactly as much. Unrecognised values still fall back to INFO.
    log_level = _LOG_LEVELS.get(settings.effective_log_level.strip().upper(), logging.INFO)
    logger = logging.getLogger("rijita")
    logger.setLevel(log_level)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
    return logger

logger = setup_logger()
