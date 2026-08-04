import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.ts";

import {
  buildExportCsv,
  buildExportPreview,
  buildGroupExportCsv,
  buildGroupExportPreview,
  buildImportPreview,
  confirmImportRows,
} from "./importExportService.ts";
import {
  ExportPreviewInput,
  ImportConfirmInput,
} from "./importExportSchemas.ts";

const isCsvFile = (file: Express.Multer.File): boolean => {
  const lowerName = file.originalname.toLowerCase();
  const lowerMimeType = file.mimetype.toLowerCase();

  return (
    lowerName.endsWith(".csv") ||
    lowerMimeType === "text/csv" ||
    lowerMimeType === "application/csv" ||
    lowerMimeType === "application/vnd.ms-excel"
  );
};

export const previewImport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const csvTextFromBody =
      typeof req.body?.csvText === "string" ? req.body.csvText : "";

    if (!file && !csvTextFromBody.trim()) {
      return res.status(400).json({
        error: "Provide csvText in JSON or upload one CSV file in field 'file'.",
      });
    }

    if (file && !isCsvFile(file)) {
      return res.status(400).json({
        error: "Uploaded file must be a CSV file.",
      });
    }

    const csvText = file
      ? file.buffer.toString("utf8")
      : csvTextFromBody;

    const preview = buildImportPreview(csvText);
    return res.status(200).json(preview);
  } catch (error) {
    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate import preview.",
    });
  }
});

export const confirmImport = asyncHandler(async (
  req: Request<{}, {}, ImportConfirmInput>,
  res: Response
) => {
  const result = await confirmImportRows(req.userId!, req.body);
  return res.status(200).json(result);
});

export const previewExport = asyncHandler(async (
  req: Request<{}, {}, ExportPreviewInput>,
  res: Response
) => {
  try {
    const result = await buildExportPreview(req.userId!, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate export preview.",
    });
  }
});

export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const csvContent = await buildExportCsv(req.userId!);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="personal-transactions-export.csv"'
  );

  return res.status(200).send(csvContent);
});

export const previewGroupExport = asyncHandler(async (
  req: Request<{ groupId: string }, {}, ExportPreviewInput>,
  res: Response
) => {
  try {
    const result = await buildGroupExportPreview(req.params.groupId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate group export preview.",
    });
  }
});

export const exportGroupCsv = asyncHandler(async (
  req: Request<{ groupId: string }>,
  res: Response
) => {
  const csvContent = await buildGroupExportCsv(req.params.groupId);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="group-transactions-export.csv"'
  );

  return res.status(200).send(csvContent);
});
