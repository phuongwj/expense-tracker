# Python Microservice

This folder contains the FastAPI microservice skeleton for:

- mock AI-powered financial insights
- mock receipt and invoice extraction

The service currently returns mock responses only. It does not call Gemini and does not perform real OCR yet.

## Endpoints

- `GET /health`
- `POST /generate-insights`
- `POST /extract-receipt`

## Project Structure

```text
python-microservice/
  app/
    __init__.py
    main.py
    models.py
  .env.example
  README.md
  requirements.txt
```

## Setup

1. Create and activate a virtual environment.
2. Install dependencies.
3. Copy `.env.example` to `.env`.
4. Start the FastAPI server.

### Windows PowerShell

```powershell
cd python-microservice
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### OpenAPI Docs

After the server starts:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Sample Requests

### Health Check

```http
GET /health
```

### Generate Insights

Personal mode:

```json
{
  "scope": "personal",
  "period": "monthly",
  "totalIncome": 1800,
  "totalExpenses": 1350,
  "netBalance": 450,
  "topCategories": [
    { "category": "Food", "amount": 400 },
    { "category": "Rent", "amount": 750 }
  ],
  "recurringExpenses": [
    { "name": "Netflix", "amount": 17 }
  ]
}
```

Group mode:

```json
{
  "scope": "group",
  "period": "monthly",
  "groupName": "Roommates",
  "totalGroupExpenses": 1200,
  "topCategories": [
    { "category": "Rent", "amount": 900 },
    { "category": "Groceries", "amount": 180 }
  ],
  "memberContributions": [
    { "memberName": "Rohan", "paid": 930, "share": 400, "balance": 530 },
    { "memberName": "Alex", "paid": 180, "share": 400, "balance": -220 }
  ]
}
```

Mock response:

```json
{
  "summary": "Mock financial insight summary",
  "riskLevel": "medium",
  "positiveNotes": ["Your spending data is available for analysis."],
  "warnings": ["This is a mock response until Gemini is connected."],
  "recommendations": ["Set a weekly spending limit for high-spend categories."],
  "nextActions": ["Review your top spending categories."]
}
```

### Extract Receipt

Current mock request shape:

```json
{
  "fileName": "receipt.jpg",
  "mimeType": "image/jpeg",
  "documentType": "receipt"
}
```

Mock response:

```json
{
  "merchant": "Mock Merchant",
  "date": "2026-06-18",
  "amount": 25.99,
  "category": "Food",
  "description": "Mock receipt extraction result"
}
```

## Notes For Later

- connect `/generate-insights` to Gemini after backend summary payloads are finalized
- replace `/extract-receipt` mock logic with real OCR pipeline
- add authentication between backend and this microservice if needed
- switch receipt extraction to file upload when the frontend/backend contract is ready
