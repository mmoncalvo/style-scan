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
import https from "https";
import { execSync } from "child_process";

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
console.log(">>> [init] Configuring Sequelize...");
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(process.cwd(), 'database.sqlite'),
  dialectModule: sqlite3Verbose,
  // logging: console.log,
  logging: false
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
  rawResponse: DataTypes.TEXT,
  masks: DataTypes.TEXT,
  isMock: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
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
      const baseUrl = process.env.PERFECT_CORP_API_URL || "https://yce-api-01.makeupar.com/s2s/v2.0";
      const startTaskUrl = `${baseUrl}/task/skin-analysis`;

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

      // 1. Construct the public image URL so Perfect Corp can download it
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const cleanAppUrl = appUrl.replace(/\/$/, "");
      const publicImageUrl = `${cleanAppUrl}/uploads/${req.file.filename}`;
      
      console.log(`[analyze] Public Image URL for API: ${publicImageUrl}`);

      // 2. Start Task (POST)
      console.log(`[analyze] Sending POST to ${startTaskUrl}`);
      let startResponse;
      try {
        startResponse = await axios.post(startTaskUrl, {
          src_file_url: publicImageUrl,
          dst_actions: [
            "wrinkle", "pore", "texture", "acne", "oiliness",
            "eye_bag", "age_spot", "dark_circle_v2",
            "droopy_upper_eyelid", "droopy_lower_eyelid",
            "moisture", "redness", "skin_type"
          ],
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
      } catch (err: any) {
        if (err.response?.data?.error_code === 'CreditInsufficiency') {
          console.warn("[analyze] API key out of credits! Falling back to mock data.");
          const mockData = {
            skinScore: 82, skinAge: 27, skinType: "Mixta", spots: 8, wrinkles: 12,
            texture: 18, darkCircles: 25, pores: 14, redness: 10, oiliness: 20,
            moisture: 65, eyebag: 15, droopyEyelid: 5, acne: 3
          };
          const savedAnalysis = await Analysis.create({
            ...mockData,
            masks: "{}",
            isMock: true,
            imageUrl: `/uploads/${req.file.filename}`,
            rawResponse: JSON.stringify(err.response.data)
          });
          
          const jsonRes = savedAnalysis.toJSON();
          jsonRes.masks = {};
          return res.json(jsonRes);
        }
        throw err;
      }

      console.log(`[analyze] Start Response:`, JSON.stringify(startResponse.data));

      const taskId = startResponse.data?.data?.task_id;
      if (!taskId) {
        throw new Error(`task_id not found in response: ${JSON.stringify(startResponse.data)}`);
      }

      // 2. Poll Task
      // Use task_status_url if provided, otherwise construct it
      const taskStatusUrl = startResponse.data?.data?.task_status_url;
      const defaultPollUrl = `${baseUrl}/task/skin-analysis`;

      const results = await pollTask(taskId, apiKey, taskStatusUrl || defaultPollUrl);
      console.log(`[analyze] Task ${taskId} succeeded`);

      // 3. Map Results
      const rList = results?.output || [];
      
      const rObj: Record<string, any> = {};
      const masksObj: Record<string, string> = {};
      
      console.log("[analyze] Descargando y convirtiendo capas/masks a Base64...");
      // Convert to for...of to allow await inside the loop
      for (const item of rList) {
        rObj[item.type] = item;
        if (item.mask_urls && item.mask_urls.length > 0) {
           const maskUrl = item.mask_urls[0];
           try {
             // Download the mask image
             const imgRes = await axios.get(maskUrl, { responseType: 'arraybuffer' });
             const contentType = imgRes.headers['content-type'] || 'image/png';
             const base64Data = Buffer.from(imgRes.data, 'binary').toString('base64');
             masksObj[item.type] = `data:${contentType};base64,${base64Data}`;
           } catch (e: any) {
             console.error(`[analyze] No se pudo descargar la capa para ${item.type}: ${e.message}`);
             // Si falla la descarga, guardamos la URL como fallback temporal
             masksObj[item.type] = maskUrl;
           }
        }
      }

      // Helper to extract score or value (now handles ui_score, raw_score or score)
      const getVal = (obj: any) => obj?.ui_score ?? obj?.score ?? obj?.value ?? 0;

      const analysisData = {
        skinScore: getVal(rObj['all']) || 85, 
        skinAge: getVal(rObj['skin_age']) || 25,
        skinType: rObj['skin_type']?.skin_type || "Unknown",
        spots: getVal(rObj['age_spot']),
        wrinkles: getVal(rObj['wrinkle']),
        texture: getVal(rObj['texture']),
        darkCircles: getVal(rObj['dark_circle_v2']),
        pores: getVal(rObj['pore']),
        redness: getVal(rObj['redness']),
        oiliness: getVal(rObj['oiliness']),
        moisture: getVal(rObj['moisture']),
        eyebag: getVal(rObj['eye_bag']),
        droopyEyelid: Math.max(getVal(rObj['droopy_upper_eyelid']), getVal(rObj['droopy_lower_eyelid'])),
        acne: getVal(rObj['acne'])
      };

      // Save to database
      const savedAnalysis = await Analysis.create({
        ...analysisData,
        masks: JSON.stringify(masksObj),
        imageUrl: `/uploads/${req.file.filename}`,
        rawResponse: JSON.stringify(results)
      });

      // Parse it back to object before sending to frontend
      const jsonRes = savedAnalysis.toJSON();
      try {
        jsonRes.masks = JSON.parse(jsonRes.masks);
      } catch (e) {
        jsonRes.masks = {};
      }

      res.json(jsonRes);
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
      const parsedHistory = history.map(record => {
        const jsonRecord = record.toJSON();
        try {
          if (typeof jsonRecord.masks === 'string') {
            jsonRecord.masks = JSON.parse(jsonRecord.masks);
          }
        } catch (e) {
          jsonRecord.masks = {};
        }
        return jsonRecord;
      });
      console.log(`>>> [api/history] Found ${parsedHistory.length} records.`);
      res.json(parsedHistory);
    } catch (error: any) {
      console.error(">>> [api/history] Error fetching history:", error);
      res.status(500).json({
        error: "Failed to fetch history",
        details: error.message
      });
    }
  });

  app.delete("/api/history/:id", async (req, res) => {
    try {
      console.log(`>>> [api/history] Deleting record ${req.params.id}...`);
      const deletedCount = await Analysis.destroy({
        where: { id: req.params.id }
      });
      if (deletedCount === 0) {
        return res.status(404).json({ error: "Record not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error(">>> [api/history] Error deleting record:", error);
      res.status(500).json({
        error: "Failed to delete record",
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

  // Setup HTTPS
  const HTTPS_PORT = process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT, 10) : 3001;
  const keyPath = path.join(process.cwd(), 'server.key');
  const certPath = path.join(process.cwd(), 'server.cert');

  // Generate certs automatically if they don't exist
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log(">>> [startServer] HTTPS certificates missing. Generating self-signed certificates...");
    try {
      execSync('openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365 -subj "/CN=localhost"');
      console.log(">>> [startServer] Certificates generated successfully.");
    } catch (e: any) {
      console.error(">>> [startServer] Failed to generate certificates:", e.message);
    }
  }

  // Start listening on HTTP IMMEDIATELY
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> [startServer] HTTP Server is listening on port ${PORT}`);
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

  // Start listening on HTTPS
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      https.createServer(httpsOptions, app).listen(HTTPS_PORT, "0.0.0.0", () => {
        console.log(`>>> [startServer] HTTPS Server is listening on port ${HTTPS_PORT}`);
      });
    } catch (err) {
      console.error(">>> [startServer] Failed to start HTTPS server:", err);
    }
  }
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
