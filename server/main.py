import uvicorn
import os
from app.config import settings

if __name__ == "__main__":
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.NODE_ENV == "development",
        workers=1 if settings.NODE_ENV == "development" else 4
    )
