import express from "express";
import multer from "multer";

import { extractReceipt, generateInsights } from "./aiController.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/insights", requireAuth, generateInsights);
router.post(
  "/extract-receipt",
  requireAuth,
  upload.single("file"),
  extractReceipt
);

export default router;
