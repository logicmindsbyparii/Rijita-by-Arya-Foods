import logging
import sys
from app.config import settings

def setup_logger():
    # getLevelNamesMapping() is the registry logging itself validates against —
    # unlike getattr(logging, name), which would happily resolve a stray
    # LOG_LEVEL to any module-level int (logging.raiseExceptions is True, and
    # bool is an int). Unrecognised values still fall back to INFO.
    log_level = logging.getLevelNamesMapping().get(
        settings.effective_log_level.strip().upper(), logging.INFO
    )
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
