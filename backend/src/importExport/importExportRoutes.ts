import express from "express";
import multer from "multer";

import {
  confirmImport,
  exportCsv,
  previewExport,
  previewImport,
} from "./importExportController.ts";
import { validateBody } from "../middleware/validateRequest.ts";
import {
  exportPreviewSchema,
  importConfirmSchema,
} from "./importExportSchemas.ts";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024,
  },
});

router.post("/import/preview", upload.single("file"), previewImport);
router.post("/import/confirm", validateBody(importConfirmSchema), confirmImport);
router.post("/export/preview", validateBody(exportPreviewSchema), previewExport);
router.get("/export/csv", exportCsv);

export default router;
