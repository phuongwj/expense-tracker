from __future__ import annotations

import base64
import json
import logging
import os
from datetime import date, datetime

try:
    from groq import Groq
except ImportError:  # pragma: no cover - optional dependency fallback
    Groq = None  # type: ignore[assignment]

from app.models import (
    ReceiptExtractionRequest,
    ReceiptExtractionResponse,
    ReceiptVisionExtractionResult,
)

logger = logging.getLogger("expense_tracker_ai.receipts")

DEFAULT_GROQ_VISION_MODEL = "qwen/qwen3.6-27b"
FALLBACK_RECEIPT_DATE = date(2026, 7, 31)
SUPPORTED_GROQ_VISION_MODELS = {
    "qwen/qwen3.6-27b",
}


def build_fallback_receipt_extraction(
    payload: ReceiptExtractionRequest | None = None,
    *,
    reason: str | None = None,
) -> ReceiptExtractionResponse:
    file_name = payload.fileName if payload else "receipt-upload"
    readable_name = os.path.splitext(os.path.basename(file_name))[0].replace("_", " ")
    merchant_name = readable_name.strip() or "Receipt Upload"
    description = "Draft transaction generated from receipt upload."

    if reason:
        description = f"{description} Review and update any missing details."

    return ReceiptExtractionResponse(
        merchant=merchant_name.title(),
        date=FALLBACK_RECEIPT_DATE,
        amount=0,
        category="Other",
        description=description,
        confidence="fallback",
    )


def _build_data_url(image_bytes: bytes, mime_type: str) -> str:
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{base64_image}"
    logger.info(
        "Receipt OCR base64 data URL created. mimeType=%s base64Chars=%s dataUrlPrefix=%s",
        mime_type,
        len(base64_image),
        data_url[:48],
    )
    return data_url


def _parse_receipt_date(raw_value: str) -> date:
    normalized_value = raw_value.strip()
    formats = (
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m-%d-%Y",
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
    )

    for date_format in formats:
        try:
            return datetime.strptime(normalized_value, date_format).date()
        except ValueError:
            continue

    return date.fromisoformat(normalized_value)


def _extract_json_object(raw_content: str) -> dict[str, object]:
    stripped = raw_content.strip()

    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()

    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start_index = stripped.find("{")
    end_index = stripped.rfind("}")

    if start_index == -1 or end_index == -1 or end_index <= start_index:
        raise ValueError("No JSON object found in Groq response content.")

    candidate = stripped[start_index : end_index + 1]
    parsed = json.loads(candidate)

    if not isinstance(parsed, dict):
        raise ValueError("Groq response JSON was not an object.")

    return parsed


def generate_groq_receipt_extraction(
    payload: ReceiptExtractionRequest,
    image_bytes: bytes,
) -> tuple[ReceiptExtractionResponse | None, str | None]:
    api_key = os.getenv("GROQ_API_KEY")
    vision_model = os.getenv("GROQ_VISION_MODEL", DEFAULT_GROQ_VISION_MODEL)

    logger.info(
        "Receipt OCR request received. fileName=%s mimeType=%s byteSize=%s",
        payload.fileName,
        payload.mimeType,
        len(image_bytes),
    )
    logger.info("Groq key present: %s", bool(api_key))
    logger.info("Groq vision model: %s", vision_model)
    logger.info(
        "Configured model listed as supported for vision: %s",
        vision_model in SUPPORTED_GROQ_VISION_MODELS,
    )

    if not api_key:
        reason = "GROQ_API_KEY is not configured."
        logger.warning("Receipt OCR fallback reason: %s", reason)
        return None, reason

    if Groq is None:
        reason = "Groq SDK is not installed in this environment."
        logger.warning("Receipt OCR fallback reason: %s", reason)
        return None, reason

    if not image_bytes:
        reason = "Uploaded receipt image was empty."
        logger.warning("Receipt OCR fallback reason: %s", reason)
        return None, reason

    try:
        client = Groq(api_key=api_key)
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a receipt OCR extraction API. Return strict JSON only "
                    "with no markdown, no code fences, and no extra text. Extract "
                    "the best available values from the uploaded receipt image. Use "
                    "this exact JSON shape: "
                    '{"merchant":"string","date":"YYYY-MM-DD","totalAmount":0,'
                    '"categorySuggestion":"string","description":"string",'
                    '"confidence":"string or null"}. '
                    "If a value is uncertain, use a conservative best guess and keep "
                    "the description short."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"Extract receipt data for a {payload.documentType}. "
                            "Return only valid JSON. Focus on merchant name, purchase "
                            "date, total amount, category suggestion, and a short "
                            "description. Dates should be normalized to YYYY-MM-DD when possible."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": _build_data_url(
                                image_bytes=image_bytes,
                                mime_type=payload.mimeType,
                            )
                        },
                    },
                ],
            },
        ]

        logger.info(
            "Sending Groq vision request with image_url content format."
        )
        response = client.chat.completions.create(
            model=vision_model,
            temperature=0.1,
            max_completion_tokens=500,
            response_format={"type": "json_object"},
            messages=messages,
        )

        content = response.choices[0].message.content or ""
        logger.info("Groq vision raw content preview: %s", content[:200])
        parsed = _extract_json_object(content)
        validated = ReceiptVisionExtractionResult.model_validate(parsed)
        parsed_date = _parse_receipt_date(validated.date)
        logger.info(
            "Groq vision extraction succeeded. merchant=%s date=%s amount=%s category=%s confidence=%s",
            validated.merchant,
            parsed_date.isoformat(),
            validated.totalAmount,
            validated.categorySuggestion,
            validated.confidence,
        )
        return (
            ReceiptExtractionResponse(
                merchant=validated.merchant,
                date=parsed_date,
                amount=validated.totalAmount,
                category=validated.categorySuggestion,
                description=validated.description,
                confidence=validated.confidence or "vision",
            ),
            None,
        )
    except Exception as exc:  # pragma: no cover - network/API dependent
        reason = f"Groq vision request failed: {exc.__class__.__name__}."
        logger.exception("Receipt OCR fallback reason: %s", reason)
        return None, reason
