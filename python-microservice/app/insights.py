from __future__ import annotations

import json
import os
from typing import Any

try:
    from groq import Groq
except ImportError:  # pragma: no cover - optional dependency fallback
    Groq = None  # type: ignore[assignment]

from app.models import (
    GroupInsightsRequest,
    InsightsRequest,
    InsightsResponse,
    PersonalInsightsRequest,
)

GROQ_MODEL = "llama-3.3-70b-versatile"


def _response_contract() -> dict[str, Any]:
    return {
        "type": "object",
        "required": [
            "summary",
            "riskLevel",
            "positiveNotes",
            "warnings",
            "recommendations",
            "nextActions",
        ],
        "properties": {
            "summary": {"type": "string"},
            "riskLevel": {
                "type": "string",
                "enum": ["low", "medium", "high"],
            },
            "positiveNotes": {
                "type": "array",
                "items": {"type": "string"},
            },
            "warnings": {
                "type": "array",
                "items": {"type": "string"},
            },
            "recommendations": {
                "type": "array",
                "items": {"type": "string"},
            },
            "nextActions": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "additionalProperties": False,
    }


def _summary_payload(summary: InsightsRequest) -> dict[str, Any]:
    return summary.model_dump(mode="json")


def build_fallback_insights(
    summary: InsightsRequest, reason: str | None = None
) -> InsightsResponse:
    if isinstance(summary, PersonalInsightsRequest):
        if summary.netBalance < 0:
            risk_level = "high"
            summary_text = (
                f"Your {summary.period} personal spending is currently above "
                "your income, so this period needs closer attention."
            )
            recommendations = [
                "Reduce spending in your highest-cost categories this week.",
                "Pause or review optional recurring expenses.",
            ]
        elif summary.totalExpenses > summary.totalIncome * 0.85:
            risk_level = "medium"
            summary_text = (
                f"Your {summary.period} personal budget is active and fairly "
                "tight, but still manageable."
            )
            recommendations = [
                "Set a weekly spending limit for high-spend categories.",
                "Track smaller purchases to avoid budget drift.",
            ]
        else:
            risk_level = "low"
            summary_text = (
                f"Your {summary.period} personal budget looks stable with a "
                "positive balance."
            )
            recommendations = [
                "Keep monitoring your top categories to maintain this trend."
            ]

        top_category = (
            summary.topCategories[0].category
            if summary.topCategories
            else "your tracked categories"
        )
        positive_notes = [
            "Your spending data is available for analysis.",
            f"Top spending insight is already visible through {top_category}.",
        ]
        warnings = [
            "Fallback insights are being used because Groq is unavailable."
        ]
        next_actions = [
            "Review your top spending categories.",
            "Compare your next week of spending against this summary.",
        ]
    else:
        net_balances = [member.balance for member in summary.memberContributions]
        has_large_imbalance = any(abs(balance) >= 100 for balance in net_balances)
        risk_level = "medium" if has_large_imbalance else "low"
        summary_text = (
            f"The {summary.groupName} group's {summary.period} expenses are "
            "ready for review, with contribution balances available for each "
            "member."
        )
        positive_notes = [
            "Shared expense data is available for analysis.",
            "Group contributions can already be compared against each member's share.",
        ]
        warnings = [
            "Fallback insights are being used because Groq is unavailable."
        ]
        recommendations = [
            "Review the highest group spending categories together.",
            "Settle larger positive and negative member balances early.",
        ]
        next_actions = [
            "Check which members have the biggest outstanding balances.",
            "Review whether shared costs need a new split approach next period.",
        ]

    if reason:
        warnings.append(reason)

    return InsightsResponse(
        summary=summary_text,
        riskLevel=risk_level,
        positiveNotes=positive_notes,
        warnings=warnings,
        recommendations=recommendations,
        nextActions=next_actions,
    )


def generate_groq_insights(
    summary: InsightsRequest,
) -> tuple[InsightsResponse | None, str | None]:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        return None, "GROQ_API_KEY is not configured."

    if Groq is None:
        return None, "Groq SDK is not installed in this environment."

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.2,
            max_completion_tokens=600,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a financial insights API for university "
                        "students. Return strict JSON only with no markdown, "
                        "no code fences, and no extra text. Focus on concise, "
                        "student-friendly financial explanation and suggestions. "
                        "Do not invent unsupported facts. Do not perform complex "
                        "math beyond the summary provided. Follow this JSON "
                        f"contract exactly: {json.dumps(_response_contract())}"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Generate insights for the following structured "
                        "financial summary. Support both personal and group "
                        "mode. Return only valid JSON.\n\n"
                        f"{json.dumps(_summary_payload(summary), ensure_ascii=True)}"
                    ),
                },
            ],
        )

        content = response.choices[0].message.content or ""
        parsed = json.loads(content)
        validated = InsightsResponse.model_validate(parsed)
        return validated, None
    except Exception as exc:  # pragma: no cover - network/API dependent
        return None, f"Groq request failed: {exc.__class__.__name__}."
