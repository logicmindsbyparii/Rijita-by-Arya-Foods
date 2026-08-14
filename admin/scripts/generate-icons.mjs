/**
 * Generate PWA icons from the SVG source file.
 * Run from client directory: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");
const publicDir = path.join(projectDir, "public");
const iconsDir = path.join(publicDir, "icons");

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [192, 384, 512];
const svgPath = path.join(iconsDir, "icon.svg");

async function generateIcons() {
  console.log("Generating icons from:", svgPath);
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

  console.log("\n✅ All icons generated successfully!");
}

generateIcons().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
