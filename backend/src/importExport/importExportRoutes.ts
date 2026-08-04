import express from "express";
import multer from "multer";

import {
  confirmImport,
  exportCsv,
  exportGroupCsv,
  previewExport,
  previewGroupExport,
  previewImport,
} from "./importExportController.ts";
import { validateBody } from "../middleware/validateRequest.ts";
import {
  exportPreviewSchema,
  importConfirmSchema,
} from "./importExportSchemas.ts";
import { requireAuth, requireGroupMember } from "../middleware/authMiddleware.ts";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024,
  },
});

router.post("/import/preview", requireAuth, upload.single("file"), previewImport);
router.post(
  "/import/confirm",
  requireAuth,
  validateBody(importConfirmSchema),
  confirmImport
);
router.post(
  "/export/preview",
  requireAuth,
  validateBody(exportPreviewSchema),
  previewExport
);
router.get("/export/csv", requireAuth, exportCsv);
router.post(
  "/export/group/:groupId/preview",
  requireAuth,
  requireGroupMember,
  validateBody(exportPreviewSchema),
  previewGroupExport
);
router.get(
  "/export/group/:groupId/csv",
  requireAuth,
  requireGroupMember,
  exportGroupCsv
);

export default router;
