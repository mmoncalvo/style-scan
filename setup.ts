import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import { sequelize, User, Analysis, Product, setDbReady } from './src/config/database.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const KEY_PATH = path.join(process.cwd(), 'server.key');
const CERT_PATH = path.join(process.cwd(), 'server.cert');
const USERS_DATA_PATH = path.join(process.cwd(), 'data', 'users.json');
const ANALYSES_DATA_PATH = path.join(process.cwd(), 'data', 'analyses.json');
const PRODUCTS_DATA_PATH = path.join(process.cwd(), 'data', 'products.json');

async function setup() {
  console.log(">>> [setup] Starting project initialization...");

  // 1. Ensure directories exist
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(">>> [setup] Creating uploads directory...");
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbs');
  if (!fs.existsSync(THUMBS_DIR)) {
    console.log(">>> [setup] Creating uploads/thumbs directory...");
    fs.mkdirSync(THUMBS_DIR, { recursive: true });
  }

  // 2. Generate HTTPS certificates if missing
  if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
    console.log(">>> [setup] Generating self-signed HTTPS certificates...");
    try {
      execSync('openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365 -subj "/CN=localhost"');
      console.log(">>> [setup] Certificates generated successfully.");
    } catch (e: any) {
      console.error(">>> [setup] Failed to generate certificates:", e.message);
    }
  }

  // 3. Initialize Database
  try {
    console.log(">>> [setup] Authenticating database...");
    await sequelize.authenticate();

    console.log(">>> [setup] Syncing database schema...");
    await sequelize.sync({ force: true }); // Start fresh

    // 4. Seed Users
    if (fs.existsSync(USERS_DATA_PATH)) {
      console.log(">>> [setup] Seeding users from data/users.json...");
      const usersData = JSON.parse(fs.readFileSync(USERS_DATA_PATH, 'utf-8'));
      for (const data of usersData) {
        await User.create(data);
      }
      console.log(`>>> [setup] Seeded ${usersData.length} users.`);
    }

    // 5. Seed Analysis Data from JSON
    if (fs.existsSync(ANALYSES_DATA_PATH)) {
      console.log(">>> [setup] Seeding analysis data from data/analyses.json...");
      const analysesData = JSON.parse(fs.readFileSync(ANALYSES_DATA_PATH, 'utf-8'));
      for (const data of analysesData) {
        await Analysis.create(data);
      }
      console.log(`>>> [setup] Seeded ${analysesData.length} analysis records.`);
    }

    // 6. Seed Products from JSON
    if (fs.existsSync(PRODUCTS_DATA_PATH)) {
      console.log(">>> [setup] Seeding products from data/products.json...");
      const productsData = JSON.parse(fs.readFileSync(PRODUCTS_DATA_PATH, 'utf-8'));
      for (const data of productsData) {
        // If data already has 'images' (string) and 'id' (string), we just use it
        // If it's old format with 'image' (string), we adapt it
        const productData = { ...data };
        if (productData.image && !productData.images) {
          productData.images = JSON.stringify([productData.image]);
          delete productData.image;
        }
        if (productData.range === undefined) {
          productData.range = Math.floor(Math.random() * 11) * 10;
        }
        await Product.create(productData);
      }
      console.log(`>>> [setup] Seeded ${productsData.length} products.`);
    }

    console.log(">>> [setup] Database initialized and seeded successfully.");
    setDbReady(true);
  } catch (err) {
    console.error(">>> [setup] Error during database initialization:", err);
    process.exit(1);
  }

  console.log(">>> [setup] Project setup complete!");
  await sequelize.close();
}

setup();
