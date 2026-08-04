from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request, UploadFile
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.insights import build_fallback_insights, generate_groq_insights
from app.models import (
    HealthResponse,
    InsightsRequest,
    InsightsResponse,
    ReceiptExtractionRequest,
    ReceiptExtractionResponse,
)
from app.receipts import (
    build_fallback_receipt_extraction,
    generate_groq_receipt_extraction,
)

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=False)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("expense_tracker_ai.main")

SERVICE_NAME = os.getenv("SERVICE_NAME", "expense-tracker-ai-microservice")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

app = FastAPI(
    title="Expense Tracker AI Microservice",
    version=APP_VERSION,
    description=(
        "FastAPI microservice for Groq-backed receipt extraction and "
        "AI-powered financial insights."
    ),
)


@app.on_event("startup")
def log_startup_configuration() -> None:
    logger.info("Dotenv path checked: %s", ENV_FILE)
    logger.info("Dotenv file exists: %s", ENV_FILE.exists())
    logger.info("Groq key present: %s", bool(os.getenv("GROQ_API_KEY")))
    logger.info(
        "Groq vision model configured: %s",
        os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.6-27b"),
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
async def extract_receipt(request: Request) -> ReceiptExtractionResponse:
    content_type = request.headers.get("content-type", "")
    logger.info("Receipt endpoint content-type: %s", content_type)

    if content_type.startswith("multipart/form-data"):
        form_data = await request.form()
        uploaded_file = form_data.get("file")
        document_type = str(form_data.get("documentType") or "receipt")
        receipt_text = form_data.get("receiptText")
        logger.info("Receipt multipart form keys: %s", list(form_data.keys()))
        logger.info(
            "Receipt multipart file detected: %s type=%s",
            uploaded_file is not None,
            type(uploaded_file).__name__ if uploaded_file is not None else "None",
        )

        if not isinstance(uploaded_file, (UploadFile, StarletteUploadFile)):
            logger.warning(
                "Receipt OCR fallback reason: Uploaded receipt image was missing from multipart form."
            )
            fallback_payload = ReceiptExtractionRequest(
                fileName="receipt-upload",
                mimeType="application/octet-stream",
                documentType="receipt",
                receiptText=(
                    str(receipt_text).strip()
                    if isinstance(receipt_text, str) and receipt_text.strip()
                    else None
                ),
            )
            return build_fallback_receipt_extraction(
                fallback_payload,
                reason="Uploaded receipt image was missing.",
            )

        receipt_payload = ReceiptExtractionRequest(
            fileName=uploaded_file.filename or "receipt-upload",
            mimeType=uploaded_file.content_type or "application/octet-stream",
            documentType=(
                "invoice" if document_type == "invoice" else "receipt"
            ),
            receiptText=(
                str(receipt_text).strip()
                if isinstance(receipt_text, str) and receipt_text.strip()
                else None
            ),
        )
        image_bytes = await uploaded_file.read()
        logger.info(
            "Receipt multipart upload accepted. fileName=%s mimeType=%s byteSize=%s",
            receipt_payload.fileName,
            receipt_payload.mimeType,
            len(image_bytes),
        )
        groq_response, groq_error = generate_groq_receipt_extraction(
            payload=receipt_payload,
            image_bytes=image_bytes,
        )

        if groq_response is not None:
            return groq_response

        logger.warning("Receipt OCR fallback returned to client. reason=%s", groq_error)
        return build_fallback_receipt_extraction(
            receipt_payload,
            reason=groq_error,
        )

    request_body = ReceiptExtractionRequest.model_validate(await request.json())
    logger.info(
        "Receipt OCR JSON fallback path used. fileName=%s mimeType=%s",
        request_body.fileName,
        request_body.mimeType,
    )
    return build_fallback_receipt_extraction(
        request_body,
        reason="Receipt image upload was not provided.",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=ENVIRONMENT == "development",
    )
