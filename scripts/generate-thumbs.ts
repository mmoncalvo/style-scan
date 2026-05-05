import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateThumbs() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const thumbsDir = path.join(uploadsDir, 'thumbs');

  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  try {
    const files = fs.readdirSync(uploadsDir);
    let count = 0;

    console.log(`>>> Generating thumbnails for existing images in ${uploadsDir}...`);

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      
      // Skip directories (like thumbs or products) and non-image files
      if (fs.statSync(filePath).isDirectory()) continue;
      if (!file.match(/\.(jpg|jpeg|png|webp|gif)$/i)) continue;

      const thumbPath = path.join(thumbsDir, file);

      if (!fs.existsSync(thumbPath)) {
        try {
          await sharp(filePath)
            .resize(200, 200, { fit: 'cover' })
            .toFile(thumbPath);
          console.log(`  - Generated thumb for ${file}`);
          count++;
        } catch (err: any) {
          console.error(`  - Failed to generate thumb for ${file}:`, err.message);
        }
      }
    }

    console.log(`>>> Thumbnails generation complete. Created ${count} new thumbnails.`);
  } catch (err) {
    console.error(">>> Failed to read uploads directory:", err);
  }
}

generateThumbs();
