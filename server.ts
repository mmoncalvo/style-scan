import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import axios from "axios";
import { Sequelize, DataTypes } from "sequelize";
import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure uploads directory exists - re-applied
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function pollTask(taskId: string, apiKey: string, baseUrl: string) {
  const maxAttempts = 100; // Increased attempts for robustness
  const intervalMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[pollTask] Attempt ${attempt} for task ${taskId}`);
    const pollUrl = `${baseUrl}/${encodeURIComponent(taskId)}`;
    const response = await axios.get(pollUrl, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    const taskStatus = response.data?.data?.task_status;
    if (taskStatus === 'success') {
      return response.data?.data?.results;
    }
    if (taskStatus === 'error') {
      throw new Error(`Task failed: ${JSON.stringify(response.data)}`);
    }
    await sleep(intervalMs);
  }
  throw new Error('Max attempts exceeded while polling');
}

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
  app.use('/uploads', express.static('uploads'));
  
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
      const baseUrl = process.env.PERFECT_CORP_API_URL || "https://yce-api-01.makeupar.com/s2s/v2.0/task/skin-analysis";

      if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
        console.warn("Using mock data because PERFECT_CORP_API_KEY is not configured.");
        // Mock data fallback
        const mockData = {
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
        
        const savedAnalysis = await Analysis.create({
          ...mockData,
          imageUrl: `/uploads/${req.file.filename}`,
          rawResponse: JSON.stringify(mockData)
        });
        return res.json(savedAnalysis);
      }

      console.log(`[analyze] Starting task for file: ${req.file.filename} (using Base64)`);

      // 1. Read file and convert to Base64
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString('base64');

      // 2. Start Task (POST)
      const startResponse = await axios.post(baseUrl, {
        src_file_base64: base64Image,
        dst_actions: [],
        miniserver_args: {
          enable_mask_overlay: false
        },
        format: "json"
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      });

      const taskId = startResponse.data?.data?.task_id;
      if (!taskId) {
        throw new Error(`task_id not found in response: ${JSON.stringify(startResponse.data)}`);
      }

      // 2. Poll Task
      const results = await pollTask(taskId, apiKey, baseUrl);
      console.log(`[analyze] Task ${taskId} succeeded`);

      // 3. Map Results
      // The API returns values in snake_case, mapping them to our model
      const analysisData = {
        skinScore: results.skin_score || 0,
        skinAge: results.skin_age || 0,
        skinType: results.skin_type || "Unknown",
        spots: results.spots || 0,
        wrinkles: results.wrinkles || 0,
        texture: results.texture || 0,
        darkCircles: results.dark_circles || 0,
        pores: results.pores || 0,
        redness: results.redness || 0,
        oiliness: results.oiliness || 0,
        moisture: results.moisture || 0,
        eyebag: results.eyebag || 0,
        droopyEyelid: results.droopy_eyelid || 0,
        acne: results.acne || 0
      };

      // Save to database
      const savedAnalysis = await Analysis.create({
        ...analysisData,
        imageUrl: `/uploads/${req.file.filename}`,
        rawResponse: JSON.stringify(results)
      });

      res.json(savedAnalysis);
    } catch (error: any) {
      console.error("Analysis error:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "Failed to analyze skin", 
        details: error.response?.data || error.message 
      });
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
