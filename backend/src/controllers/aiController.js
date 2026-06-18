const DEFAULT_TIMEOUT_MS = 5000;

function buildMockFinancialSummary() {
  return {
    scope: "personal",
    period: "monthly",
    totalIncome: 1800,
    totalExpenses: 1350,
    netBalance: 450,
    topCategories: [
      { category: "Food", amount: 400 },
      { category: "Rent", amount: 750 },
    ],
    recurringExpenses: [
      { name: "Netflix", amount: 17 },
    ],
  };
}

async function postInsightsRequest(payload) {
  const baseUrl = process.env.AI_SERVICE_URL;

  if (!baseUrl) {
    return {
      ok: false,
      status: 500,
      body: {
        message: "AI_SERVICE_URL is not configured.",
      },
    };
  }

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

    const body = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch (error) {
    const isAbortError = error.name === "AbortError";

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
}

async function generateInsights(req, res) {
  const payload = buildMockFinancialSummary();
  const result = await postInsightsRequest(payload);

  if (!result.ok) {
    return res.status(result.status).json({
      message: result.body.message || "Failed to reach AI microservice.",
      mockSummary: payload,
    });
  }

  return res.status(200).json({
    mockSummary: payload,
    insights: result.body,
  });
}

module.exports = {
  generateInsights,
};
