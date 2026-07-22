import express from "express";

import { extractReceipt, generateInsights } from "./aiController.ts";

const router = express.Router();

router.post("/insights", generateInsights);
router.post("/extract-receipt", extractReceipt);

export default router;
