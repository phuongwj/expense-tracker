import {
  InsightsSummary,
  ReceiptExtractionRequestBody,
} from "./aiSchemas.ts";

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_AI_SERVICE_URL = "http://127.0.0.1:8000";

export interface InsightsResponsePayload {
  summary: string;
  riskLevel: "low" | "medium" | "high";
  positiveNotes: string[];
  warnings: string[];
  recommendations: string[];
  nextActions: string[];
}

export interface AiServiceSuccess {
  ok: true;
  status: number;
  body: InsightsResponsePayload;
}

export interface AiServiceFailure {
  ok: false;
  status: number;
  body: {
    message: string;
  };
}

export type AiServiceResult = AiServiceSuccess | AiServiceFailure;

export interface ReceiptExtractionMicroservicePayload {
  fileName: string;
  mimeType: string;
  documentType: "receipt" | "invoice";
}

export interface ReceiptExtractionResponsePayload {
  merchant: string;
  date: string;
  amount: number;
  category: string;
  description: string;
}

export interface ReceiptExtractionSuccess {
  ok: true;
  status: number;
  body: ReceiptExtractionResponsePayload;
}

export interface ReceiptExtractionFailure {
  ok: false;
  status: number;
  body: {
    message: string;
  };
}

export type ReceiptExtractionServiceResult =
  | ReceiptExtractionSuccess
  | ReceiptExtractionFailure;

export const buildMockFinancialSummary = (): InsightsSummary => ({
  scope: "personal",
  period: "monthly",
  totalIncome: 1800,
  totalExpenses: 1350,
  netBalance: 450,
  topCategories: [
    { category: "Food", amount: 400 },
    { category: "Rent", amount: 750 },
  ],
  recurringExpenses: [{ name: "Netflix", amount: 17 }],
});

export const postInsightsRequest = async (
  payload: InsightsSummary
): Promise<AiServiceResult> => {
  const baseUrl = process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/generate-insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = (await response.json()) as InsightsResponsePayload;

    return {
      ok: response.ok,
      status: response.status,
      body: response.ok
        ? body
        : {
            message:
              typeof (body as { message?: unknown }).message === "string"
                ? (body as { message: string }).message
                : "AI microservice returned an error.",
          },
    } as AiServiceResult;
  } catch (error) {
    const isAbortError =
      error instanceof Error && error.name === "AbortError";

    return {
      ok: false,
      status: 503,
      body: {
        message: isAbortError
          ? "AI microservice request timed out."
          : "AI microservice is unavailable.",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const buildMockReceiptExtractionPayload = (
  requestBody?: ReceiptExtractionRequestBody
): ReceiptExtractionMicroservicePayload => ({
  fileName: requestBody?.fileName || "mock-receipt.txt",
  mimeType: requestBody?.mimeType || "text/plain",
  documentType: requestBody?.documentType || "receipt",
});

export const buildDraftTransaction = (
  extraction: ReceiptExtractionResponsePayload
) => ({
  date: extraction.date,
  description: extraction.description,
  amount: extraction.amount,
  type: "expense" as const,
  category: extraction.category,
  merchant: extraction.merchant,
});

export const postReceiptExtractionRequest = async (
  payload: ReceiptExtractionMicroservicePayload
): Promise<ReceiptExtractionServiceResult> => {
  const baseUrl = process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/extract-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = (await response.json()) as ReceiptExtractionResponsePayload;

    return {
      ok: response.ok,
      status: response.status,
      body: response.ok
        ? body
        : {
            message:
              typeof (body as { message?: unknown }).message === "string"
                ? (body as { message: string }).message
                : "AI microservice returned an error.",
          },
    } as ReceiptExtractionServiceResult;
  } catch (error) {
    const isAbortError =
      error instanceof Error && error.name === "AbortError";

    return {
      ok: false,
      status: 503,
      body: {
        message: isAbortError
          ? "AI microservice request timed out."
          : "AI microservice is unavailable.",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
};
