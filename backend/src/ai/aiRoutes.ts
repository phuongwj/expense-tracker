import express from "express";
import multer from "multer";

import { extractReceipt, generateInsights, warmUpAi } from "./aiController.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Unauthenticated on purpose: it takes no input, returns no data, and needs
// to be callable from the login screen so the AI service warms up early.
router.post("/warmup", warmUpAi);

router.post("/insights", requireAuth, generateInsights);
router.post(
  "/extract-receipt",
  requireAuth,
  upload.single("file"),
  extractReceipt
);

export default router;
