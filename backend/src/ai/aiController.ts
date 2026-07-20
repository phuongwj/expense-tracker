import { Request, Response } from "express";

import {
  buildMockFinancialSummary,
  postInsightsRequest,
} from "./aiService.ts";
import {
  insightsRequestBodySchema,
  insightsSummarySchema,
} from "./aiSchemas.ts";

export const generateInsights = async (req: Request, res: Response) => {
  const parsedBody = insightsRequestBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    const fields: Record<string, string> = {};

    for (const issue of parsedBody.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!(key in fields)) {
        fields[key] = issue.message;
      }
    }

    return res.status(400).json({
      error: "Validation failed.",
      fields,
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
  }

  return res.status(200).json({
    summarySent: summary,
    insights: result.body,
  });
};
