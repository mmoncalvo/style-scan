import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import { sequelize, User, Analysis, Product, setDbReady } from './src/config/database.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const KEY_PATH = path.join(process.cwd(), 'server.key');
const CERT_PATH = path.join(process.cwd(), 'server.cert');
const ANALYSES_DATA_PATH = path.join(process.cwd(), 'data', 'analyses.json');
const PRODUCTS_DATA_PATH = path.join(process.cwd(), 'data', 'products.json');

async function setup() {
  console.log(">>> [setup] Starting project initialization...");

  // 1. Ensure directories exist
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(">>> [setup] Creating uploads directory...");
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
    console.log(">>> [setup] Seeding users...");
    const hashedAdminPassword = await bcrypt.hash('admin', 10);
    await User.create({
      id: '7e6a5529-66d0-456d-bd7d-d6c1161bd9b3', // Keep IDs from original dump if possible
      username: 'admin',
      password: hashedAdminPassword,
      role: 'admin',
      fullName: 'Administrador',
      email: 'admin@example.com'
    });

    const hashedClientePassword = await bcrypt.hash('cliente', 10);
    const cliente = await User.create({
      id: 'def75906-3320-4f65-b99b-e62356e367a5',
      username: 'cliente',
      password: hashedClientePassword,
      role: 'cliente',
      fullName: 'Cliente de Prueba',
      email: 'cliente@example.com'
    });

    // 5. Seed Analysis Data from JSON
    if (fs.existsSync(ANALYSES_DATA_PATH)) {
      console.log(">>> [setup] Seeding analysis data from data/analyses.json...");
      const analysesData = JSON.parse(fs.readFileSync(ANALYSES_DATA_PATH, 'utf-8'));
      
      for (const data of analysesData) {
        // We omit createdAt/updatedAt to let Sequelize handle them or we can include them
        // If we want exact replica, we include everything
        await Analysis.create(data);
      }
      console.log(`>>> [setup] Seeded ${analysesData.length} analysis records.`);
    } else {
      console.warn(">>> [setup] data/analyses.json not found, skipping analysis seeding.");
    }

    // 6. Seed Products from JSON
    if (fs.existsSync(PRODUCTS_DATA_PATH)) {
      console.log(">>> [setup] Seeding products from data/products.json...");
      const productsData = JSON.parse(fs.readFileSync(PRODUCTS_DATA_PATH, 'utf-8'));
      for (const data of productsData) {
        // Adapt data from image to images array
        const productData = {
          ...data,
          images: JSON.stringify([data.image])
        };
        delete productData.image;
        await Product.create(productData);
      }
      console.log(`>>> [setup] Seeded ${productsData.length} products.`);
    } else {
      console.warn(">>> [setup] data/products.json not found, skipping product seeding.");
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
