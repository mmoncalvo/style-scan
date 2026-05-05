import { sequelize, isDbReady, setDbReady } from './src/config/database.js';
import { createServer as createViteServer } from "vite";
import apiRoutes from './src/routes/api.js';
import { execSync } from "child_process";
import express from "express";
import dotenv from "dotenv";
import logger from 'morgan';
import https from "https";
import chalk from 'chalk';
import path from "path";
import fs from "fs";

dotenv.config({ quiet: true });

const HTTPS_PORT = process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT, 10) : 3001;
const certPath = path.join(process.cwd(), 'server.cert');
const keyPath = path.join(process.cwd(), 'server.key');
const PORT = 3000;

const app = express();

async function startServer() {
  console.log(chalk.bgCyanBright(chalk.black(">>> [init] Initializing...")));
  console.log(chalk.cyan(`>>> [init] Environment: ${process.env.NODE_ENV || 'development'}`));

  // Generate certs automatically if they don't exist
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log(chalk.yellow(">>> [startServer] HTTPS certificates missing. Generating self-signed certificates..."));
    try {
      execSync('openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365 -subj "/CN=localhost"');
      console.log(chalk.green(">>> [startServer] Certificates generated successfully."));
    } catch (e: any) {
      console.error(chalk.red(">>> [startServer] Failed to generate certificates:"), e.message);
    }
  }

  // Ensure uploads directory exists
  const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbs');
    if (!fs.existsSync(THUMBS_DIR)) {
      fs.mkdirSync(THUMBS_DIR, { recursive: true });
    }
    fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
    console.log(chalk.cyan(">>> [init] Uploads directory is writable."));
  } catch (err) {
    console.error(chalk.red(">>> [init] Error with uploads directory:"), err);
  }

  app.use(logger("dev"));
  app.use(express.json());
  app.use('/uploads', express.static('uploads'));
  app.use('/data/images', express.static(path.join(process.cwd(), 'data/images')));
  
  // API Routes
  app.use('/api', apiRoutes);

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

  // Middleware to check DB readiness
  app.use((req, res, next) => {
    if (!isDbReady() && req.path.startsWith('/api') && req.path !== '/api/health') {
      console.log(`>>> [middleware] DB not ready, blocking request to ${req.path}`);
      return res.status(503).json({ error: "Database is initializing, please try again in a moment." });
    }
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log(chalk.cyan(">>> [Vite] Starting Vite in middleware mode..."));

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
      console.log(chalk.cyan(">>> [Vite] Vite middleware attached."));
    } catch (viteError) {
      console.error(chalk.red(">>> [Vite] Failed to start Vite middleware:"), viteError);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initialize database in the background
  (async () => {
    try {
      console.log(chalk.bgYellowBright(chalk.black(">>> [db] Authenticating database")));
      await sequelize.authenticate();
      console.log(chalk.yellow(">>> [db] Database connection established."));
      
      await sequelize.sync();
      
      console.log(chalk.yellow(">>> [db] Database synced."));
      setDbReady(true);

      console.log(chalk.bgGreenBright(chalk.black(">>> [startServer] Initializing servers...")));
      // Start listening on HTTPS
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        try {
          const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
          };
          https.createServer(httpsOptions, app).listen(HTTPS_PORT, "0.0.0.0", () => {
            console.log(chalk.green(`>>> [startServer] HTTPS Server is listening on port ${HTTPS_PORT}`));
          });
        } catch (err) {
          console.error(chalk.red(">>> [startServer] Failed to start HTTPS server:"), err);
        }
      }

      // Start listening on HTTP IMMEDIATELY
      app.listen(PORT, "0.0.0.0", () => {
        console.log(chalk.green(`>>> [startServer] HTTP Server is listening on port ${PORT}`));
      });


    } catch (err) {
      console.error(chalk.red(">>> [db] Unable to connect to the database:"), err);
    }
  })();

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
