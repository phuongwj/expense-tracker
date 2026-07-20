import express from "express";

import { generateInsights } from "./aiController.ts";

const router = express.Router();

router.post("/insights", generateInsights);

export default router;
