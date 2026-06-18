const express = require("express");

const { generateInsights } = require("../controllers/aiController");

const router = express.Router();

router.post("/insights", generateInsights);

module.exports = router;
