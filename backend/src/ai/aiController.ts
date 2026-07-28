import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.ts";

import {
  buildDraftTransaction,
  buildMockFinancialSummary,
  buildMockReceiptExtractionPayload,
  postInsightsRequest,
  postReceiptExtractionRequest,
} from "./aiService.ts";
import {
  insightsRequestBodySchema,
  insightsSummarySchema,
  receiptExtractionRequestSchema,
} from "./aiSchemas.ts";

const buildValidationFields = (issues: { path: PropertyKey[]; message: string }[]) => {
  const fields: Record<string, string> = {};

  for (const issue of issues) {
    const key = issue.path.join(".") || "_root";
    if (!(key in fields)) {
      fields[key] = issue.message;
    }
  }

  return fields;
};

export const generateInsights = asyncHandler( async (req: Request, res: Response) => {
  const parsedBody = insightsRequestBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      error: "Validation failed.",
      fields: buildValidationFields(parsedBody.error.issues),
    });
  }

  const body = parsedBody.data;
  const hasProvidedSummary =
    !!body && typeof body === "object" && Object.keys(body).length > 0;
  const summary = hasProvidedSummary
    ? insightsSummarySchema.parse(body)
    : buildMockFinancialSummary();

  const result = await postInsightsRequest(summary);

  if (!result.ok) {
    return res.status(503).json({
      message: result.body.message,
      summarySent: summary,
    });
  };

  return res.status(200).json({
    summarySent: summary,
    insights: result.body,
  });
});

export const extractReceipt = asyncHandler(async (req: Request, res: Response) => {
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
      receiptRequest: payload,
    });
  }

  return res.status(200).json({
    merchant: result.body.merchant,
    date: result.body.date,
    totalAmount: result.body.amount,
    categorySuggestion: result.body.category,
    description: result.body.description,
    draftTransaction: buildDraftTransaction(result.body),
    confidence: null,
    note: requestBody?.receiptText
      ? "Mock extraction used receipt text as placeholder input. Real OCR is not connected yet."
      : "Mock extraction result returned by the FastAPI receipt service.",
  });
});
