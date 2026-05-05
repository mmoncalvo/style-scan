import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Analysis, User, Product } from '../config/database.js'; // tsx resolves this seamlessly
import sharp from 'sharp';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: "Forbidden: Admin access required" });
  }
};

// Auth Routes
router.post('/register', async (req: any, res: any) => {
  try {
    const { username, password, fullName, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user: any = await User.create({ username, password: hashedPassword, fullName, email });
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const user: any = await User.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/profile', authenticate, async (req: any, res: any) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/profile', authenticate, async (req: any, res: any) => {
  try {
    const { fullName, email, password } = req.body;
    const user: any = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates: any = { fullName, email };
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    await user.update(updates);
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Multer Setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // If fieldname is 'productImages', save to uploads/products/
    const dest = file.fieldname === 'productImages' ? 'uploads/products/' : 'uploads/';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post("/upload-products", authenticate, isAdmin, upload.array('productImages', 10), (req: any, res: any) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }
    const paths = files.map(file => `/uploads/products/${file.filename}`);
    res.json({ paths });
  } catch (error: any) {
    console.error(">>> [api/upload-products] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

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

// Products Routes
router.get("/products", async (req: any, res: any) => {
  try {
    const { target } = req.query;
    const where: any = {};
    if (target) where.target = target;

    const products = await Product.findAll({ where, order: [['updatedAt', 'DESC']] });
    const parsedProducts = products.map((p: any) => {
      const json = p.toJSON();
      try {
        json.images = JSON.parse(json.images || '[]');
      } catch (e) {
        json.images = [];
      }
      return json;
    });
    res.json(parsedProducts);
  } catch (error: any) {
    console.error(">>> [api/get-products] Error:", error);
    res.status(500).json({ error: "Failed to fetch products", details: error.message });
  }
});

router.post("/products", authenticate, isAdmin, async (req: any, res: any) => {
  try {
    const data = { ...req.body };
    if (Array.isArray(data.images)) {
      data.images = JSON.stringify(data.images);
    }
    const product = await Product.create(data);
    res.json(product);
  } catch (error: any) {
    console.error(">>> [api/post-products] Error:", error);
    res.status(400).json({ error: error.message });
  }
});

router.put("/products/:id", authenticate, isAdmin, async (req: any, res: any) => {
  try {
    const product: any = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const data = { ...req.body };
    if (Array.isArray(data.images)) {
      data.images = JSON.stringify(data.images);
    }

    await product.update(data);
    res.json(product);
  } catch (error: any) {
    console.error(">>> [api/put-products] Error:", error);
    res.status(400).json({ error: error.message });
  }
});

router.delete("/products/:id", authenticate, isAdmin, async (req: any, res: any) => {
  try {
    const deletedCount = await Product.destroy({ where: { id: req.params.id } });
    if (deletedCount === 0) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true });
  } catch (error: any) {
    console.error(">>> [api/delete-products] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API Routes
router.post("/analyze", upload.single('image'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Generate thumbnail
    try {
      const thumbPath = path.join(process.cwd(), 'uploads', 'thumbs', req.file.filename);
      await sharp(req.file.path)
        .resize(200, 200, { fit: 'cover' })
        .toFile(thumbPath);
      console.log(`[analyze] Thumbnail generated: ${thumbPath}`);
    } catch (err) {
      console.error(`[analyze] Failed to generate thumbnail:`, err);
    }

    // Extract userId if token is present
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (e) {
        // Allow anonymous analysis
      }
    }

    const apiKey = process.env.PERFECT_CORP_API_KEY;
    const baseUrl = process.env.PERFECT_CORP_API_URL || "https://yce-api-01.makeupar.com/s2s/v2.0";
    const startTaskUrl = `${baseUrl}/task/skin-analysis`;

    // if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    //   console.warn("Using mock data because PERFECT_CORP_API_KEY is not configured.");
    //   // Mock data fallback
    //   const mockData = {
    //     skinScore: 85,
    //     skinAge: 25,
    //     skinType: "Normal",
    //     spots: 10,
    //     wrinkles: 5,
    //     texture: 15,
    //     darkCircles: 20,
    //     pores: 12,
    //     redness: 8,
    //     oiliness: 10,
    //     moisture: 70,
    //     eyebag: 5,
    //     droopyEyelid: 2,
    //     droopyLowerEyelid: 3,
    //     firmness: 88,
    //     radiance: 75,
    //     acne: 0
    //   };

    //   const savedAnalysis = await Analysis.create({
    //     ...mockData,
    //     userId,
    //     imageUrl: `/uploads/${req.file.filename}`
    //   });
    //   return res.json(savedAnalysis);
    // }

    console.log(`[analyze] Starting task for file: ${req.file.filename}`);

    // 1. Register file to get upload URL and file_id
    const registerFileUrl = `${baseUrl}/file/skin-analysis`;
    console.log(`[analyze] Registering file at ${registerFileUrl}`);
    const registerResponse = await axios.post(registerFileUrl, {
      files: [{
        file_name: req.file.filename,
        file_size: req.file.size,
        content_type: req.file.mimetype
      }]
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    // The response structure typically has an array of files
    const fileData = registerResponse.data?.data?.files?.[0];
    const fileId = fileData?.file_id;
    const uploadUrl = fileData?.requests?.[0]?.url;

    if (!fileId || !uploadUrl) {
      throw new Error(`Failed to get fileId or uploadUrl: ${JSON.stringify(registerResponse.data)}`);
    }

    // 2. Upload file to the provided URL
    console.log(`[analyze] Uploading file to S3 via pre-signed URL`);
    const imagePath = req.file.path;
    const imageData = fs.readFileSync(imagePath);
    await axios.put(uploadUrl, imageData, {
      headers: {
        "Content-Type": req.file.mimetype
      }
    });

    // 3. Start Task (POST)
    console.log(`[analyze] Sending POST to ${startTaskUrl} with src_file_id: ${fileId}`);
    let startResponse;
    try {
      startResponse = await axios.post(startTaskUrl, {
        src_file_id: fileId,
        dst_actions: [
          "wrinkle", "pore", "texture", "acne", "oiliness",
          "eye_bag", "age_spot", "dark_circle_v2",
          "droopy_upper_eyelid", "droopy_lower_eyelid",
          "moisture", "redness", "skin_type", "firmness", "radiance"
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
          // skinScore: 82, skinAge: 27, skinType: "Mixta", spots: 8, wrinkles: 12,
          // texture: 18, darkCircles: 25, pores: 14, redness: 10, oiliness: 20,
          // moisture: 65, eyebag: 15, droopyEyelid: 5, droopyLowerEyelid: 6,
          // firmness: 70, radiance: 60, acne: 3
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
          droopyLowerEyelid: 3,
          firmness: 88,
          radiance: 75,
          acne: 0

        };
        const savedAnalysis = await Analysis.create({
          ...mockData,
          userId,
          masks: "{}",
          isMock: true,
          imageUrl: `/uploads/${req.file.filename}`
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

    // 3. Poll Task
    const taskStatusUrl = startResponse.data?.data?.task_status_url;
    const defaultPollUrl = `${baseUrl}/task/skin-analysis`;

    const results = await pollTask(taskId, apiKey, taskStatusUrl || defaultPollUrl);
    console.log(`[analyze] Task ${taskId} succeeded`);

    // 4. Map Results
    const rList = results?.output || [];

    const rObj: Record<string, any> = {};
    const masksObj: Record<string, string> = {};

    console.log("[analyze] Descargando y convirtiendo capas/masks a Base64...");
    for (const item of rList) {
      rObj[item.type] = item;
      if (item.mask_urls && item.mask_urls.length > 0) {
        const maskUrl = item.mask_urls[0];
        try {
          const imgRes = await axios.get(maskUrl, { responseType: 'arraybuffer' });
          const contentType = imgRes.headers['content-type'] || 'image/png';
          const base64Data = Buffer.from(imgRes.data, 'binary').toString('base64');
          masksObj[item.type] = `data:${contentType};base64,${base64Data}`;
        } catch (e: any) {
          console.error(`[analyze] No se pudo descargar la capa para ${item.type}: ${e.message}`);
          masksObj[item.type] = maskUrl;
        }
      }
    }

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
      droopyEyelid: getVal(rObj['droopy_upper_eyelid']),
      droopyLowerEyelid: getVal(rObj['droopy_lower_eyelid']),
      firmness: getVal(rObj['firmness']),
      radiance: getVal(rObj['radiance']),
      acne: getVal(rObj['acne'])
    };

    // Save to database
    const savedAnalysis = await Analysis.create({
      ...analysisData,
      userId,
      masks: JSON.stringify(masksObj),
      imageUrl: `/uploads/${req.file.filename}`
    });

    const jsonRes = savedAnalysis.toJSON();
    try {
      jsonRes.masks = JSON.parse(jsonRes.masks);
      delete jsonRes.masks.resize_image;
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

router.get("/history", async (req: any, res: any) => {
  try {
    console.log(">>> [api/history] Fetching guest analysis history...");

    // Always fetch records with userId = null (guest history)
    const history = await Analysis.findAll({
      where: { userId: null },
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: { exclude: ['masks'] }
    });
    const parsedHistory = history.map((record: any) => {
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
    res.json(parsedHistory);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch history", details: error.message });
  }
});

router.get("/my-history", authenticate, async (req: any, res: any) => {
  try {
    console.log(`>>> [api/my-history] Fetching history for user ${req.user.id}...`);
    const history = await Analysis.findAll({
      where: { userId: req.user.id },
      order: [['updatedAt', 'DESC']],
      limit: 50,
      attributes: { exclude: ['masks'] }
    });
    const parsedHistory = history.map((record: any) => {
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
    res.json(parsedHistory);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch user history", details: error.message });
  }
});

router.get("/analysis/:id", async (req: any, res: any) => {
  try {
    console.log(`>>> [api/analysis] Fetching analysis details for ${req.params.id}...`);
    const record: any = await Analysis.findOne({
      where: { id: req.params.id }
    });
    if (!record) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    // Optional: add security check here if we want to ensure userId matches
    // But for now, we just return the analysis data since history relies on knowing the ID.

    const jsonRecord = record.toJSON();
    try {
      if (typeof jsonRecord.masks === 'string') {
        jsonRecord.masks = JSON.parse(jsonRecord.masks);
        delete jsonRecord.masks.resize_image;
      }
    } catch (e) {
      jsonRecord.masks = {};
    }
    res.json(jsonRecord);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch analysis details", details: error.message });
  }
});

router.delete("/history/:id", async (req: any, res: any) => {
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

export default router;
