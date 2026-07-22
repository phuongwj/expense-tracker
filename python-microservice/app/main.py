from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI

from app.insights import build_fallback_insights, generate_groq_insights
from app.models import (
    HealthResponse,
    InsightsRequest,
    InsightsResponse,
    ReceiptExtractionRequest,
    ReceiptExtractionResponse,
)

load_dotenv()

SERVICE_NAME = os.getenv("SERVICE_NAME", "expense-tracker-ai-microservice")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

app = FastAPI(
    title="Expense Tracker AI Microservice",
    version=APP_VERSION,
    description=(
        "FastAPI microservice for mock receipt extraction and AI-powered "
        "financial insights."
    ),
)


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=SERVICE_NAME,
        version=APP_VERSION,
    )


@app.post(
    "/generate-insights",
    response_model=InsightsResponse,
    tags=["insights"],
)
def generate_insights(summary: InsightsRequest) -> InsightsResponse:
    groq_response, groq_error = generate_groq_insights(summary)
    if groq_response is not None:
        return groq_response

    return build_fallback_insights(summary, groq_error)


@app.post(
    "/extract-receipt",
    response_model=ReceiptExtractionResponse,
    tags=["receipts"],
)
def extract_receipt(_: ReceiptExtractionRequest) -> ReceiptExtractionResponse:
    return ReceiptExtractionResponse(
        merchant="Mock Merchant",
        date="2026-06-18",
        amount=25.99,
        category="Food",
        description="Mock receipt extraction result",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=ENVIRONMENT == "development",
    )
