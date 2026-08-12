import type { Transaction } from "../transactions/transactionModel.ts";
import {
  InsightsSummary,
  PersonalInsightsSummary,
  ReceiptDocumentType,
  ReceiptExtractionRequestBody,
} from "./aiSchemas.ts";

// Total budget for one user-facing AI call *including* cold-start retries,
// not per attempt. Kept under Render's ~100s router idle timeout.
const DEFAULT_TIMEOUT_MS = 90000;
const DEFAULT_AI_SERVICE_URL = "http://127.0.0.1:8000";

// Render's free instances spin down after 15 min idle. While one boots, the
// router rejects requests with an *immediate* 502/503/504 rather than
// holding them - so retrying matters far less than retrying for long enough.
// A boot regularly runs past a minute, which is why a handful of retries a
// few seconds apart never caught it.
const COLD_START_RETRY_DELAY_MS = 6000;
const COLD_START_STATUSES = new Set([502, 503, 504]);

// Nobody is waiting on the warm-up response, so it can afford to sit through
// a full boot instead of giving up while the instance is still starting.
const WARMUP_TIMEOUT_MS = 240000;

// A "warm" reading goes stale once Render spins the instance back down.
// Expiring it early means the next page load re-pings instead of trusting a
// reading from before the shutdown.
const WARM_STATE_TTL_MS = 600000;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const getAiServiceBaseUrl = () =>
  process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;

interface ColdStartOptions {
  budgetMs: number;
  label: string;
}

/**
 * Performs `attempt` and retries while the microservice looks cold
 * (connection refused/reset, or a Render router 5xx) until `budgetMs` is
 * spent. Returns the last response even if it still failed, so callers keep
 * their existing error-mapping behaviour.
 *
 * Each attempt gets its own AbortController: a single shared one stays
 * aborted once it fires, so the first timeout would poison every retry after
 * it. `budgetMs` is what bounds the sequence as a whole.
 */
const fetchThroughColdStart = async (
  attempt: (signal: AbortSignal) => Promise<Response>,
  { budgetMs, label }: ColdStartOptions
): Promise<Response> => {
  const deadline = Date.now() + budgetMs;
  let attemptNumber = 0;

  // Retrying is pointless once there is no room left for the round trip that
  // would follow the wait.
  const outOfBudget = () => deadline - Date.now() <= COLD_START_RETRY_DELAY_MS;

  for (;;) {
    attemptNumber += 1;

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(deadline - Date.now(), 1)
    );

    try {
      const response = await attempt(controller.signal);

      if (!COLD_START_STATUSES.has(response.status) || outOfBudget()) {
        return response;
      }

      console.warn(
        `[ai] ${label}: microservice returned ${response.status} on attempt ` +
          `${attemptNumber} (likely cold start), retrying...`
      );
    } catch (error) {
      // The only thing that aborts this attempt is its own timer, which is
      // set to whatever is left of the budget - so there is nothing to retry.
      const isAbortError = error instanceof Error && error.name === "AbortError";

      if (isAbortError || outOfBudget()) {
        throw error;
      }

      console.warn(
        `[ai] ${label}: microservice unreachable on attempt ${attemptNumber} ` +
          `(likely cold start), retrying...`,
        error instanceof Error ? error.message : error
      );
    } finally {
      clearTimeout(timer);
    }

    await delay(COLD_START_RETRY_DELAY_MS);
  }
};

/**
 * Fire-and-forget wake-up call so the microservice boots while the user is
 * still browsing, instead of on their first AI request. Deduplicated so a
 * burst of page loads only triggers one in-flight ping.
 */
export type AiWarmState = "cold" | "warming" | "warm" | "unavailable";

let warmUpInFlight: Promise<boolean> | null = null;
let warmState: AiWarmState = "cold";
let warmedAt = 0;

export const getAiWarmState = (): AiWarmState => {
  if (warmState === "warm" && Date.now() - warmedAt > WARM_STATE_TTL_MS) {
    warmState = "cold";
  }

  return warmState;
};

const pingAiService = async (): Promise<boolean> => {
  try {
    // The whole point of the warm-up is to survive a boot, so it retries
    // through cold-start 5xx exactly like a real AI call does - the previous
    // version fired one bare fetch and swallowed the instant 503, which made
    // it a no-op in precisely the case it existed for.
    const response = await fetchThroughColdStart(
      (signal) => fetch(`${getAiServiceBaseUrl()}/health`, { signal }),
      { budgetMs: WARMUP_TIMEOUT_MS, label: "warm-up" }
    );

    if (response.ok) {
      warmState = "warm";
      warmedAt = Date.now();
    } else {
      warmState = "unavailable";
    }

    console.info(
      `[ai] warm-up finished: /health responded ${response.status} -> ${warmState}`
    );

    return response.ok;
  } catch (error) {
    warmState = "unavailable";
    console.warn(
      "[ai] warm-up gave up:",
      error instanceof Error ? error.message : error
    );

    return false;
  } finally {
    warmUpInFlight = null;
  }
};

export const warmUpAiService = (): Promise<boolean> => {
  if (warmUpInFlight) {
    return warmUpInFlight;
  }

  if (getAiWarmState() !== "warm") {
    warmState = "warming";
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

  try {
    const response = await fetchThroughColdStart(
      (signal) =>
        fetch(`${baseUrl}/generate-insights`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal,
        }),
      { budgetMs: DEFAULT_TIMEOUT_MS, label: "insights" }
    );

    console.info("[aiService] python insights response status:", response.status);

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

    const response = await fetchThroughColdStart(
      (signal) =>
        fetch(`${baseUrl}/extract-receipt`, {
          method: "POST",
          headers:
            payload.fileBuffer !== undefined
              ? undefined
              : {
                  "Content-Type": "application/json",
                },
          body,
          signal,
        }),
      { budgetMs: DEFAULT_TIMEOUT_MS, label: "extract-receipt" }
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
  }
};
