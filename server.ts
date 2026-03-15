import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import axios from "axios";
import { Sequelize, DataTypes } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Database Setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

const Analysis = sequelize.define('Analysis', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  skinScore: DataTypes.INTEGER,
  skinAge: DataTypes.INTEGER,
  skinType: DataTypes.STRING,
  spots: DataTypes.INTEGER,
  wrinkles: DataTypes.INTEGER,
  texture: DataTypes.INTEGER,
  darkCircles: DataTypes.INTEGER,
  pores: DataTypes.INTEGER,
  redness: DataTypes.INTEGER,
  oiliness: DataTypes.INTEGER,
  moisture: DataTypes.INTEGER,
  eyebag: DataTypes.INTEGER,
  droopyEyelid: DataTypes.INTEGER,
  acne: DataTypes.INTEGER,
  imageUrl: DataTypes.STRING,
  rawResponse: DataTypes.TEXT
});

// Multer Setup for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function startServer() {
  console.log("Starting server...");
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");
    await sequelize.sync();
    console.log("Database synced.");
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }

  app.use(express.json());
  
  // Health check for the proxy
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.post("/api/analyze", upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const apiKey = process.env.PERFECT_CORP_API_KEY;
      // const apiUrl = process.env.PERFECT_CORP_API_URL || "https://api.perfectcorp.com/v1/skin-analysis";

      if (!apiKey) {
        return res.status(500).json({ error: "API Key not configured" });
      }

      let analysisData;
      if (apiKey === "YOUR_API_KEY_HERE") {
         // Mock data for demonstration if no real key is provided
         analysisData = {
           skinScore: 85,
           skinAge: 25,
           skinType: "Normal",
           spots: 10,
           wrinkles: 5,
           texture: 15,
           darkCircles: 20,
           pores: 12,
           redness: 8,
           oiliness: 10,
           moisture: 70,
           eyebag: 5,
           droopyEyelid: 2,
           acne: 0
         };
      } else {
        // Fallback to mock for now
        analysisData = {
           skinScore: Math.floor(Math.random() * 20) + 70,
           skinAge: 28,
           skinType: "Combination",
           spots: 12,
           wrinkles: 8,
           texture: 18,
           darkCircles: 25,
           pores: 15,
           redness: 10,
           oiliness: 15,
           moisture: 65,
           eyebag: 7,
           droopyEyelid: 3,
           acne: 2
         };
      }

      // Save to database
      const savedAnalysis = await Analysis.create({
        ...analysisData,
        imageUrl: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        rawResponse: JSON.stringify(analysisData)
      });

      res.json(savedAnalysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze skin" });
    }
  });

  app.get("/api/history", async (req, res) => {
    try {
      const history = await Analysis.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10
      });
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server is listening on port ${PORT}`);
    console.log(`>>> Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
