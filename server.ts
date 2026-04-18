import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { execSync } from "child_process";
import https from "https";

import { sequelize, isDbReady, setDbReady, User } from './src/config/database.js';
import apiRoutes from './src/routes/api.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
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

async function startServer() {
  console.log(">>> [startServer] Initializing...");

  app.use(express.json());
  app.use('/uploads', express.static('uploads'));
  app.use('/data/images', express.static(path.join(process.cwd(), 'data/images')));

  // Middleware to check DB readiness
  app.use((req, res, next) => {
    if (!isDbReady() && req.path.startsWith('/api') && req.path !== '/api/health') {
      console.log(`>>> [middleware] DB not ready, blocking request to ${req.path}`);
      return res.status(503).json({ error: "Database is initializing, please try again in a moment." });
    }
    next();
  });

  // Health check for the proxy
  app.get("/api/health", async (req, res) => {
    let dbStatus = isDbReady() ? "connected" : "initializing";
    if (isDbReady()) {
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

  // API Routes
  app.use('/api', apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log(">>> [startServer] Starting Vite in middleware mode...");
      const keyPath = path.join(process.cwd(), 'server.key');
      const certPath = path.join(process.cwd(), 'server.cert');

      const viteServerConfig: any = {
        middlewareMode: true
      };

      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        viteServerConfig.https = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        };
      }

      const vite = await createViteServer({
        server: viteServerConfig,
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
        await sequelize.sync({ alter: true });
        console.log(">>> [db] Database synced with schema changes.");

        setDbReady(true);
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
