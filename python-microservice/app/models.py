from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str


class CategoryAmount(BaseModel):
    category: str = Field(..., min_length=1)
    amount: float = Field(..., ge=0)


class RecurringExpense(BaseModel):
    name: str = Field(..., min_length=1)
    amount: float = Field(..., ge=0)


class MemberContribution(BaseModel):
    memberName: str = Field(..., min_length=1)
    paid: float = Field(..., ge=0)
    share: float = Field(..., ge=0)
    balance: float


class PersonalInsightsRequest(BaseModel):
    scope: Literal["personal"]
    period: str = Field(..., min_length=1)
    totalIncome: float = Field(..., ge=0)
    totalExpenses: float = Field(..., ge=0)
    netBalance: float
    topCategories: list[CategoryAmount] = Field(default_factory=list)
    recurringExpenses: list[RecurringExpense] = Field(default_factory=list)


class GroupInsightsRequest(BaseModel):
    scope: Literal["group"]
    period: str = Field(..., min_length=1)
    groupName: str = Field(..., min_length=1)
    totalGroupExpenses: float = Field(..., ge=0)
    topCategories: list[CategoryAmount] = Field(default_factory=list)
    memberContributions: list[MemberContribution] = Field(default_factory=list)


InsightsRequest = Annotated[
    PersonalInsightsRequest | GroupInsightsRequest,
    Field(discriminator="scope"),
]


class InsightsResponse(BaseModel):
    summary: str
    riskLevel: Literal["low", "medium", "high"]
    positiveNotes: list[str]
    warnings: list[str]
    recommendations: list[str]
    nextActions: list[str]


class ReceiptExtractionRequest(BaseModel):
    fileName: str = Field(..., min_length=1)
    mimeType: str = Field(..., min_length=1)
    documentType: Literal["receipt", "invoice"] = "receipt"
    receiptText: str | None = None


class ReceiptVisionExtractionResult(BaseModel):
    merchant: str = Field(..., min_length=1)
    date: str = Field(..., min_length=1)
    totalAmount: float = Field(..., ge=0)
    categorySuggestion: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    confidence: str | None = None


class ReceiptExtractionResponse(BaseModel):
    merchant: str
    date: date
    amount: float = Field(..., ge=0)
    category: str
    description: str
    confidence: str | None = None
