import type { Transaction } from "../transactions/transactionModel.ts";
import {
  InsightsSummary,
  PersonalInsightsSummary,
  ReceiptDocumentType,
  ReceiptExtractionRequestBody,
} from "./aiSchemas.ts";

// Total budget for one AI call *including* cold-start retries, not per attempt.
const DEFAULT_TIMEOUT_MS = 90000;
const DEFAULT_AI_SERVICE_URL = "http://127.0.0.1:8000";

// Render's free instances spin down after 15 min idle. The first request
// after that either hangs while the instance boots or is rejected by
// Render's router with a 502/503/504 - so a single attempt is not enough.
const COLD_START_RETRIES = 2;
const COLD_START_RETRY_DELAY_MS = 6000;
const WARMUP_TIMEOUT_MS = 90000;
const COLD_START_STATUSES = new Set([502, 503, 504]);

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const getAiServiceBaseUrl = () =>
  process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;

/**
 * Performs `attempt` and retries while the microservice looks cold
 * (connection refused/reset, or a Render router 5xx). Returns the last
 * response even if it still failed, so callers keep their existing
 * error-mapping behaviour.
 */
const fetchThroughColdStart = async (
  attempt: () => Promise<Response>
): Promise<Response> => {
  let lastError: unknown;

  for (let tries = 0; tries <= COLD_START_RETRIES; tries += 1) {
    try {
      const response = await attempt();

      if (!COLD_START_STATUSES.has(response.status) || tries === COLD_START_RETRIES) {
        return response;
      }

      console.warn(
        `[ai] microservice returned ${response.status} (likely cold start), retrying...`
      );
    } catch (error) {
      // An abort is the caller's timeout, not a cold start - give up.
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      lastError = error;

      if (tries === COLD_START_RETRIES) {
        throw error;
      }

      console.warn("[ai] microservice unreachable (likely cold start), retrying...");
    }

    await delay(COLD_START_RETRY_DELAY_MS);
  }

  throw lastError;
};

/**
 * Fire-and-forget wake-up call so the microservice boots while the user is
 * still browsing, instead of on their first AI request. Deduplicated so a
 * burst of page loads only triggers one in-flight ping.
 */
let warmUpInFlight: Promise<boolean> | null = null;

const pingAiService = async (): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);

  try {
    const response = await fetch(`${getAiServiceBaseUrl()}/health`, {
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    warmUpInFlight = null;
  }
};

export const warmUpAiService = (): Promise<boolean> => {
  if (warmUpInFlight) {
    return warmUpInFlight;
  }

  // Assigned synchronously: pingAiService suspends at its first `await`, so
  // callers arriving during the boot share this promise instead of firing
  // another ping.
  warmUpInFlight = pingAiService();

  return warmUpInFlight;
};

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
  fileBuffer?: Buffer;
  fileName: string;
  mimeType: string;
  documentType: ReceiptDocumentType;
  receiptText?: string;
}

export interface ReceiptExtractionResponsePayload {
  merchant: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  confidence?: string | null;
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

const parseJsonResponse = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const PERSONAL_INSIGHTS_PERIOD = "monthly";
const TOP_CATEGORY_LIMIT = 5;

export const buildPersonalFinancialSummary = (
  transactions: Transaction[]
): PersonalInsightsSummary => {
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = new Map<string, number>();
  const recurringExpenses: { name: string; amount: number }[] = [];

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);

    if (transaction.type === "income") {
      totalIncome += amount;
      continue;
    }

    totalExpenses += amount;

    if (transaction.category) {
      categoryTotals.set(
        transaction.category,
        (categoryTotals.get(transaction.category) ?? 0) + amount
      );
    }

    if (transaction.isRecurring) {
      recurringExpenses.push({
        name: transaction.description || transaction.category || "Recurring expense",
        amount,
      });
    }
  }

  const topCategories = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_CATEGORY_LIMIT);

  return {
    scope: "personal",
    period: PERSONAL_INSIGHTS_PERIOD,
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    topCategories,
    recurringExpenses,
  };
};

export const postInsightsRequest = async (
  payload: InsightsSummary
): Promise<AiServiceResult> => {
  const baseUrl = getAiServiceBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchThroughColdStart(() =>
      fetch(`${baseUrl}/generate-insights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    );

    const body = await parseJsonResponse<InsightsResponsePayload | { message?: string }>(
      response
    );

    return {
      ok: response.ok,
      status: response.status,
      body: response.ok
        ? (body as InsightsResponsePayload)
        : {
            message:
              body && typeof body === "object" && typeof body.message === "string"
                ? body.message
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
  receiptText: requestBody?.receiptText,
});

export const buildUploadedReceiptPayload = (input: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  documentType?: ReceiptDocumentType;
  receiptText?: string;
}): ReceiptExtractionMicroservicePayload => ({
  fileBuffer: input.fileBuffer,
  fileName: input.fileName,
  mimeType: input.mimeType,
  documentType: input.documentType || "receipt",
  receiptText: input.receiptText,
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
  const baseUrl = getAiServiceBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const body =
      payload.fileBuffer !== undefined
        ? (() => {
            const formData = new FormData();
            const receiptBlob = new Blob([payload.fileBuffer], {
              type: payload.mimeType,
            });

            formData.append("file", receiptBlob, payload.fileName);
            formData.append("documentType", payload.documentType);

            if (payload.receiptText) {
              formData.append("receiptText", payload.receiptText);
            }

            console.info("[aiService] forwarding multipart receipt payload:", {
              hasFileBuffer: true,
              fileFieldName: "file",
              fileName: payload.fileName,
              mimeType: payload.mimeType,
              bufferSize: payload.fileBuffer.length,
              hasReceiptText: Boolean(payload.receiptText),
            });

            return formData;
          })()
        : JSON.stringify({
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            documentType: payload.documentType,
            receiptText: payload.receiptText,
          });

    if (payload.fileBuffer === undefined) {
      console.info("[aiService] forwarding JSON receipt payload fallback:", {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        documentType: payload.documentType,
        hasReceiptText: Boolean(payload.receiptText),
      });
    }

    const response = await fetchThroughColdStart(() =>
      fetch(`${baseUrl}/extract-receipt`, {
        method: "POST",
        headers:
          payload.fileBuffer !== undefined
            ? undefined
            : {
                "Content-Type": "application/json",
              },
        body,
        signal: controller.signal,
      })
    );

    console.info("[aiService] python receipt response status:", response.status);

    const parsedBody = await parseJsonResponse<
      ReceiptExtractionResponsePayload | { message?: string }
    >(response);

    return {
      ok: response.ok,
      status: response.status,
      body: response.ok
        ? (parsedBody as ReceiptExtractionResponsePayload)
        : {
            message:
              parsedBody &&
              typeof parsedBody === "object" &&
              typeof parsedBody.message === "string"
                ? parsedBody.message
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
