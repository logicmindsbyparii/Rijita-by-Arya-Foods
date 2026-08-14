import sharp, { FitEnum } from 'sharp';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const UPLOAD_PATH = path.join(__dirname, '../../', UPLOAD_DIR);
const DIRS = ['products', 'categories', 'banners', 'blogs', 'recipes', 'reviews', 'avatars', 'thumbnails', 'gallery'];
DIRS.forEach((dir) => { const p = path.join(UPLOAD_PATH, dir); if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); });

type ImageConfig = { width: number; height: number; fit?: keyof FitEnum; quality: number };

async function processImage(inputBuffer: Buffer, config: ImageConfig, outputPath: string, format: 'webp' | 'png' = 'webp'): Promise<void> {
  const pipeline = sharp(inputBuffer).resize(config.width, config.height, { fit: config.fit || 'inside', withoutEnlargement: true });
  if (format === 'png') {
    await pipeline.png({ quality: Math.min(Math.round(config.quality / 100 * 100), 100) }).toFile(outputPath);
  } else {
    await pipeline.webp({ quality: config.quality }).toFile(outputPath);
  }
}

// NOTE: diskStorage + Express hangs on Node.js v22, so we use `dest` instead.
// File type validation is done inside processImages middleware.
export const upload = multer({ dest: UPLOAD_PATH, limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 } });
export const uploadMultiple = upload.array('images', 10);
export const uploadSingle = upload.single('image');
export const uploadGallery = upload.array('gallery', 20);

const DEFAULT_CONFIG = { width: 800, height: 800, quality: 80, fit: undefined as keyof FitEnum | undefined };
export const BANNER_CONFIG = { width: 2560, height: 1440, quality: 95, fit: undefined as keyof FitEnum | undefined };

export const processImages = (options: { subDir: string; generateThumb?: boolean; config?: ImageConfig }) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const allFiles: Express.Multer.File[] = [];
      if (req.file) allFiles.push(req.file);
      else if (Array.isArray(req.files)) allFiles.push(...req.files);
      else if (req.files) Object.values(req.files).forEach((f) => { if (Array.isArray(f)) allFiles.push(...f); });
      if (allFiles.length === 0) { next(); return; }
      const uploadDir = path.join(UPLOAD_PATH, options.subDir);
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      for (const f of allFiles) {
        const tempPath = f.path;
        try {
          const buf = fs.readFileSync(tempPath);
          const baseName = path.parse(f.filename).name;
          const ext = path.extname(f.originalname).toLowerCase();
          // Validate file type (replaces the removed multer fileFilter)
          const allowedExts = ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.svg', '.avif', '.ico'];
          const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif', 'image/x-icon', 'image/vnd.microsoft.icon'];
          if (!allowedExts.includes(ext) || !allowedMimes.includes(f.mimetype || '')) {
            throw new Error(`Invalid file type: ${ext} (${f.mimetype}). Only images are allowed.`);
          }
          // Different field types get different processing
          const isFavicon = f.fieldname === 'favicon';
          const isLogo = f.fieldname === 'logo';
          const isStoryImage = f.fieldname === 'storyImage';
          // Favicon should stay as PNG (browsers don't support webp favicons)
          const outputFormat = isFavicon ? 'png' : 'webp';
          const outputExt = isFavicon ? '.png' : '.webp';
          // Use field-specific configs when available
          let fieldConfig: ImageConfig = options.config || DEFAULT_CONFIG;
          if (isFavicon) fieldConfig = { width: 64, height: 64, fit: 'cover', quality: 90 };
          if (isLogo) fieldConfig = { width: 400, height: 200, fit: 'inside', quality: 85 };
          if (isStoryImage) fieldConfig = { width: 1200, height: 800, fit: 'inside', quality: 90 };
          const outputPath = path.join(uploadDir, `${baseName}${outputExt}`);
          await processImage(buf, fieldConfig, outputPath, outputFormat);
          if (options.generateThumb !== false) {
            const thumbDir = path.join(UPLOAD_PATH, 'thumbnails', options.subDir);
            if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
            await processImage(buf, { width: 150, height: 150, quality: 70 }, path.join(thumbDir, `${baseName}-thumb.webp`));
          }
          f.path = outputPath; f.filename = `${baseName}${outputExt}`; f.destination = uploadDir;
        } finally {
          try { if (fs.existsSync(tempPath) && tempPath !== f.path) fs.unlinkSync(tempPath); } catch { /* Silently ignore cleanup errors */ }
        }
      }
      next();
    } catch (error) { next(error); }
  };

export const processSingleImage = (subDir: string, config?: typeof DEFAULT_CONFIG) => processImages({ subDir, generateThumb: false, config });
