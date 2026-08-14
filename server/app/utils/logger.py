import logging
import sys
from app.config import settings

def setup_logger():
    log_level = logging.DEBUG if settings.LOG_LEVEL.lower() == "debug" else logging.INFO
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
