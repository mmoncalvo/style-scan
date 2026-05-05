import fs from 'fs';
import path from 'path';
import { User, Analysis, Product } from '../src/config/database.js';

async function exportData() {
  console.log(">>> Starting data export from database to JSON...");

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    // 1. Export Users
    const users = await User.findAll();
    const usersData = users.map(u => u.toJSON());
    fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(usersData, null, 2));
    console.log(`>>> Exported ${users.length} users to data/users.json`);

    // 2. Export Analyses
    const analyses = await Analysis.findAll();
    const analysesData = analyses.map(a => a.toJSON());
    fs.writeFileSync(path.join(dataDir, 'analyses.json'), JSON.stringify(analysesData, null, 2));
    console.log(`>>> Exported ${analyses.length} analyses to data/analyses.json`);

    // 3. Export Products
    const products = await Product.findAll();
    const productsData = products.map(p => p.toJSON());
    fs.writeFileSync(path.join(dataDir, 'products.json'), JSON.stringify(productsData, null, 2));
    console.log(`>>> Exported ${products.length} products to data/products.json`);

    console.log(">>> Export complete!");
    process.exit(0);
  } catch (err) {
    console.error(">>> Export failed:", err);
    process.exit(1);
  }
}

exportData();
