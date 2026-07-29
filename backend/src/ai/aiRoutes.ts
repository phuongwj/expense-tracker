import express from "express";

import { extractReceipt, generateInsights } from "./aiController.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.post("/insights", requireAuth, generateInsights);
router.post("/extract-receipt", requireAuth, extractReceipt);

export default router;
