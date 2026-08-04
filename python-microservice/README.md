# Python Microservice

This FastAPI service handles:

- AI-powered financial insights through Groq with fallback mode
- receipt image upload and Groq Vision OCR attempt with safe fallback extraction

## Endpoints

- `GET /health`
- `POST /generate-insights`
- `POST /extract-receipt`

## Receipt Upload Flow

1. The frontend uploads a receipt image to the backend as `multipart/form-data`.
2. The backend forwards the image to this FastAPI service.
3. This service attempts Groq Vision OCR using `GROQ_API_KEY` and `GROQ_VISION_MODEL`.
4. If Groq Vision is unavailable, rate-limited, misconfigured, or returns invalid JSON, the service returns a safe fallback draft instead of failing.

## Setup

### Windows PowerShell

```powershell
cd python-microservice
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

```env
SERVICE_NAME=expense-tracker-ai-microservice
APP_VERSION=0.1.0
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
GROQ_API_KEY=your_groq_api_key_here
GROQ_VISION_MODEL=qwen/qwen3.6-27b
```

Do not commit real API keys or production secrets.

## Fallback Mode

The service still works if:

- `GROQ_API_KEY` is missing
- the selected Groq Vision model is unavailable
- Groq returns invalid or partial JSON
- the request is rate-limited

In those cases, `/extract-receipt` returns a safe fallback draft transaction response so the frontend can keep the review flow working.

## Sample Requests

### Health Check

```http
GET /health
```

### Generate Insights

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/generate-insights" `
  -Method POST `
  -ContentType "application/json" `
  -Body @'
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
'@
```

### Extract Receipt With Multipart Upload

```powershell
$form = @{
  file = Get-Item ".\sample-receipt.jpg"
  documentType = "receipt"
}

Invoke-RestMethod -Uri "http://127.0.0.1:8000/extract-receipt" `
  -Method POST `
  -Form $form
```

### JSON Fallback Request

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/extract-receipt" `
  -Method POST `
  -ContentType "application/json" `
  -Body @'
{
  "fileName": "receipt-demo.txt",
  "mimeType": "text/plain",
  "documentType": "receipt"
}
'@
```

## Notes

- `python-multipart` is required for FastAPI multipart parsing.
- This service does not add heavy local OCR dependencies such as Tesseract or EasyOCR.
- The backend keeps the existing `/api/ai/extract-receipt` route and maps this service response into the frontend draft transaction format.
- Smart Scan can now save the reviewed OCR draft through the backend transaction API, but the current Transactions page still renders mock/local data until that page is connected to `GET /api/transactions`.
- Smart Scan currently saves `categoryId` as `null` because a category lookup API is not available yet.
