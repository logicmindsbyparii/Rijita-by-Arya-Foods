/**
 * Generate PWA icons from the SVG source file.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "client", "public");
const iconsDir = path.join(publicDir, "icons");

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [192, 384, 512];
const svgPath = path.join(iconsDir, "icon.svg");

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated ${size}x${size} icon`);
  }

  // Generate OG image
  const ogPath = path.join(publicDir, "og-image.jpg");
  await sharp(svgBuffer)
    .resize(1200, 630, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toFile(ogPath);
  console.log("✓ Generated OG image (1200x630)");

  // Generate favicon
  const faviconPath = path.join(publicDir, "favicon.ico");
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(faviconPath);
  console.log("✓ Generated favicon (32x32)");

  console.log("\n✅ All icons generated successfully!");
}

generateIcons().catch(console.error);
