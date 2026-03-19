import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import axios from "axios";
import { Sequelize, DataTypes } from "sequelize";
import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import crypto from "crypto";

const sqlite3 = require("sqlite3");
const sqlite3Verbose = sqlite3.verbose();
dotenv.config();

const app = express();
const PORT = 3000;

// Ensure uploads directory exists - re-applied
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
  console.log(">>> [init] Uploads directory is writable.");
} catch (err) {
  console.error(">>> [init] Error with uploads directory:", err);
}

// Database Setup
console.log(">>> [init] Configuring Sequelize (In-Memory)...");
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  dialectModule: sqlite3Verbose,
  logging: console.log
});

const Analysis = sequelize.define('Analysis', {
  id: {
    type: DataTypes.STRING,
    defaultValue: () => crypto.randomUUID(),
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
    // If baseUrl already contains the taskId, don't append it again
    const pollUrl = baseUrl.includes(taskId) ? baseUrl : `${baseUrl}/${encodeURIComponent(taskId)}`;
    console.log(`[pollTask] GET ${pollUrl}`);
    const response = await axios.get(pollUrl, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    console.log(`[pollTask] Response:`, JSON.stringify(response.data));

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

let isDbReady = false;

async function startServer() {
  console.log(">>> [startServer] Initializing...");
  
  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  // Middleware to check DB readiness
  app.use((req, res, next) => {
    if (!isDbReady && req.path.startsWith('/api') && req.path !== '/api/health') {
      console.log(`>>> [middleware] DB not ready, blocking request to ${req.path}`);
      return res.status(503).json({ error: "Database is initializing, please try again in a moment." });
    }
    next();
  });

  // Health check for the proxy
  app.get("/api/health", async (req, res) => {
    let dbStatus = isDbReady ? "connected" : "initializing";
    if (isDbReady) {
      try {
        await sequelize.query('SELECT 1');
      } catch (err) {
        dbStatus = "error";
      }
    }
    res.json({ 
      status: "ok", 
      database: dbStatus,
      timestamp: new Date().toISOString() 
    });
  });

  // ... (rest of the routes will be here)

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
      console.log(`[analyze] Sending POST to ${baseUrl}`);
      const startResponse = await axios.post(baseUrl, {
        src_file_base64: base64Image,
        dst_actions: ["skin_analysis"],
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

      console.log(`[analyze] Start Response:`, JSON.stringify(startResponse.data));

      const taskId = startResponse.data?.data?.task_id;
      if (!taskId) {
        throw new Error(`task_id not found in response: ${JSON.stringify(startResponse.data)}`);
      }

      // 2. Poll Task
      // Use task_status_url if provided, otherwise construct it
      const taskStatusUrl = startResponse.data?.data?.task_status_url;
      // If no URL provided, we assume polling is at /task/{taskId}
      // baseUrl is usually /task/skin-analysis, so we strip the action part
      const defaultPollUrl = baseUrl.includes('/skin-analysis') 
        ? baseUrl.split('/skin-analysis')[0] 
        : baseUrl;
      
      const results = await pollTask(taskId, apiKey, taskStatusUrl || defaultPollUrl);
      console.log(`[analyze] Task ${taskId} succeeded`);

      // 3. Map Results
      // The API returns values in snake_case, mapping them to our model
      // Results are typically nested under skin_analysis action
      const skinData = results.skin_analysis || results;
      
      const analysisData = {
        skinScore: skinData.skin_score || 0,
        skinAge: skinData.skin_age || 0,
        skinType: skinData.skin_type || "Unknown",
        spots: skinData.spots || 0,
        wrinkles: skinData.wrinkles || 0,
        texture: skinData.texture || 0,
        darkCircles: skinData.dark_circles || 0,
        pores: skinData.pores || 0,
        redness: skinData.redness || 0,
        oiliness: skinData.oiliness || 0,
        moisture: skinData.moisture || 0,
        eyebag: skinData.eyebag || 0,
        droopyEyelid: skinData.droopy_eyelid || 0,
        acne: skinData.acne || 0
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
      console.log(">>> [api/history] Fetching analysis history...");
      const history = await Analysis.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10
      });
      console.log(`>>> [api/history] Found ${history.length} records.`);
      res.json(history);
    } catch (error: any) {
      console.error(">>> [api/history] Error fetching history:", error);
      res.status(500).json({ 
        error: "Failed to fetch history",
        details: error.message 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log(">>> [startServer] Starting Vite in middleware mode...");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false 
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log(">>> [startServer] Vite middleware attached.");
    } catch (viteError) {
      console.error(">>> [startServer] Failed to start Vite middleware:", viteError);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  console.log(">>> [startServer] Attempting to listen on port", PORT);
  // Start listening IMMEDIATELY
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> [startServer] Server is listening on port ${PORT}`);
    console.log(`>>> [startServer] Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Initialize database in the background
    (async () => {
      try {
        console.log(">>> [db] Authenticating database...");
        await sequelize.authenticate();
        console.log(">>> [db] Database connection established.");
        await sequelize.sync();
        console.log(">>> [db] Database synced.");
        isDbReady = true;
      } catch (err) {
        console.error(">>> [db] Unable to connect to the database:", err);
      }
    })();
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('>>> [CRASH] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('>>> [CRASH] Uncaught Exception thrown:', err);
  process.exit(1); // Exit with error code to trigger restart
});

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
