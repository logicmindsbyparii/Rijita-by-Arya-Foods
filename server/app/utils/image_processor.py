import os
import uuid
import aiofiles
from fastapi import UploadFile
from PIL import Image
import io
from pathlib import Path
from app.config import settings

UPLOADS_BASE_DIR = Path(__file__).parent.parent.parent / settings.UPLOAD_DIR

def ensure_dir(dir_path: Path):
    dir_path.mkdir(parents=True, exist_ok=True)

async def save_uploaded_file(file: UploadFile, sub_dir: str = "products") -> str:
    target_dir = UPLOADS_BASE_DIR / sub_dir
    ensure_dir(target_dir)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if not ext or ext not in ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif']:
        ext = '.jpg'

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = target_dir / filename

    content = await file.read()

    # If it's a rasters image, optimize using Pillow
    if ext in ['.jpg', '.jpeg', '.png', '.webp']:
        try:
            image = Image.open(io.BytesIO(content))
            image.thumbnail((1920, 1920))
            
            # Save optimized
            if ext == '.png':
                image.save(file_path, 'PNG', optimize=True)
            elif ext in ['.jpg', '.jpeg']:
                if image.mode in ('RGBA', 'P'):
                    image = image.convert('RGB')
                image.save(file_path, 'JPEG', quality=85, optimize=True)
            elif ext == '.webp':
                image.save(file_path, 'WEBP', quality=85)
        except Exception:
            # Fallback to direct write if PIL fails
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
    else:
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)

    return f"/uploads/{sub_dir}/{filename}"
