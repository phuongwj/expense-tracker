import { Request, Response } from "express";

import { asyncHandler } from "../middleware/asyncHandler.ts";
import { getPersonalTransactions } from "../transactions/transactionRepository.ts";
import {
  buildDraftTransaction,
  buildMockReceiptExtractionPayload,
  buildPersonalFinancialSummary,
  buildUploadedReceiptPayload,
  getAiWarmState,
  postInsightsRequest,
  postReceiptExtractionRequest,
  warmUpAiService,
} from "./aiService.ts";
import {
  receiptExtractionMultipartFieldsSchema,
  receiptExtractionRequestSchema,
} from "./aiSchemas.ts";

const allowedReceiptMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const buildValidationFields = (
  issues: { path: PropertyKey[]; message: string }[]
) => {
  const fields: Record<string, string> = {};

  for (const issue of issues) {
    const key = issue.path.join(".") || "_root";
    if (!(key in fields)) {
      fields[key] = issue.message;
    }
  }

  return fields;
};

/**
 * Kicks off the microservice wake-up and returns immediately. The frontend
 * calls this on load so the (free-tier, spun-down) AI instance is already
 * booting by the time the user opens AI Insights or Smart Scan.
 *
 * Reports the *current* warm state rather than a fixed "warming": the ping
 * outlives this response, so only `warm` means the microservice has actually
 * answered a health check. Anything else tells the frontend to ask again.
 */
export const warmUpAi = asyncHandler(async (_req: Request, res: Response) => {
  void warmUpAiService();
  return res.status(202).json({ status: getAiWarmState() });
});

export const generateInsights = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId!;
    const transactions = await getPersonalTransactions(userId, {});
    const summary = buildPersonalFinancialSummary(transactions);

    const result = await postInsightsRequest(summary);

    if (!result.ok) {
      return res.status(503).json({
        message: result.body.message,
        summarySent: summary,
      });
    }

    return res.status(200).json({
      summarySent: summary,
      insights: result.body,
    });
  }
);

export const extractReceipt = asyncHandler(
  async (req: Request, res: Response) => {
    console.info("[ai/extract-receipt] req.file exists:", Boolean(req.file));

    if (req.file) {
      console.info("[ai/extract-receipt] upload metadata:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        bufferSize: req.file.buffer.length,
      });

      if (!allowedReceiptMimeTypes.has(req.file.mimetype)) {
        return res.status(400).json({
          error:
            "Unsupported receipt file type. Please upload a JPG, PNG, or WEBP image.",
        });
      }

      if (req.file.buffer.length === 0) {
        return res.status(400).json({
          error: "Uploaded receipt file is empty.",
        });
      }

      const parsedFields = receiptExtractionMultipartFieldsSchema.safeParse(
        req.body
      );

      if (!parsedFields.success) {
        return res.status(400).json({
          error: "Validation failed.",
          fields: buildValidationFields(parsedFields.error.issues),
        });
      }

      const payload = buildUploadedReceiptPayload({
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname || "receipt-upload",
        mimeType: req.file.mimetype,
        documentType: parsedFields.data.documentType,
        receiptText: parsedFields.data.receiptText,
      });
      const result = await postReceiptExtractionRequest(payload);

      if (!result.ok) {
        return res.status(503).json({
          message: result.body.message,
          receiptRequest: {
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            documentType: payload.documentType,
          },
        });
      }

      return res.status(200).json({
        merchant: result.body.merchant,
        date: result.body.date,
        totalAmount: result.body.amount,
        categorySuggestion: result.body.category,
        description: result.body.description,
        draftTransaction: buildDraftTransaction(result.body),
        confidence: result.body.confidence ?? "Review recommended",
        note: "Draft transaction generated from receipt scan. Please review before saving.",
      });
    }

    console.info(
      "[ai/extract-receipt] no uploaded file detected, using JSON fallback path"
    );

    const parsedBody = receiptExtractionRequestSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Validation failed.",
        fields: buildValidationFields(parsedBody.error.issues),
      });
    }

    const requestBody = parsedBody.data;
    const payload = buildMockReceiptExtractionPayload(requestBody);
    const result = await postReceiptExtractionRequest(payload);

    if (!result.ok) {
      return res.status(503).json({
        message: result.body.message,
        receiptRequest: {
          fileName: payload.fileName,
          mimeType: payload.mimeType,
          documentType: payload.documentType,
        },
      });
    }

    return res.status(200).json({
      merchant: result.body.merchant,
      date: result.body.date,
      totalAmount: result.body.amount,
      categorySuggestion: result.body.category,
      description: result.body.description,
      draftTransaction: buildDraftTransaction(result.body),
      confidence: result.body.confidence ?? null,
      note: "Draft transaction generated from receipt scan. Please review before saving.",
    });
  }
);
