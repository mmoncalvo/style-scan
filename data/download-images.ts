import fs from 'fs';
import path from 'path';
import axios from 'axios';

async function downloadImages() {
  const dataPath = path.join(process.cwd(), 'data/data.json');
  const productsPath = path.join(process.cwd(), 'data/products.json');

  const imgDir = path.join(process.cwd(), 'data/images');

  if (!fs.existsSync(dataPath)) {
    console.error("Products file not found at:", dataPath);
    return;
  }

  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  try {
    const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let updated = false;

    console.log(`Checking ${productsData.length} products for image downloads...`);

    for (const p of productsData) {
      if (p.image && p.image.startsWith('http')) {
        const filename = `${p.id}.jpg`;
        const filepath = path.join(imgDir, filename);

        if (!fs.existsSync(filepath)) {
          console.log(`Downloading image for ${p.id}...`);
          const fallbacks = [
            "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400",
            "https://images.unsplash.com/photo-1615397323281-a67503f191b2?auto=format&fit=crop&q=80&w=400",
            "https://images.unsplash.com/photo-1598440947619-2c35fc9aa008?auto=format&fit=crop&q=80&w=400",
            "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=400",
            "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=400"
          ];

          const urlsToTry = [p.image, ...fallbacks.sort(() => 0.5 - Math.random())];
          let success = false;

          for (const url of urlsToTry) {
            try {
              const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
              const contentType = response.headers['content-type'];
              if (response.status === 200 && contentType && contentType.startsWith('image/')) {
                fs.writeFileSync(filepath, response.data);
                success = true;
                break;
              }
            } catch (downloadErr) {
              // Attempt next URL silently
            }
          }

          if (!success) {
            console.error(`Failed to download any valid image for ${p.id} after trying fallbacks.`);
          }
        }

        if (p.image !== `/data/images/${filename}`) {
          p.image = `/data/images/${filename}`;
          updated = true;
        }
      }
    }

    if (updated) {
      fs.writeFileSync(productsPath, JSON.stringify(productsData, null, 2));
      console.log("Updated data/products.json with local image paths.");
    } else {
      console.log("All products already have local image paths. No changes needed.");
    }
  } catch (e: any) {
    console.error("Product image sync failed:", e.message);
  }
}

downloadImages();
