import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { categories } from '../data/mockData'
import api from '../services/api'
import { warmUpAiService } from '../services/aiWarmup'

const steps = [
  { n: 1, title: 'Upload', sub: 'Photo or image of your receipt' },
  { n: 2, title: 'Scan', sub: 'Merchant, amount, and date are extracted' },
  { n: 3, title: 'Review & save', sub: 'Adjust anything before confirming' },
]

const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

interface ReceiptDraft {
  merchant: string
  date: string
  amount: string
  category: string
  description: string
  kind: 'Expense' | 'Income'
  receiptText: string
}

interface ExtractReceiptResponse {
  merchant?: string
  date?: string
  totalAmount?: number
  categorySuggestion?: string
  description?: string
  draftTransaction?: {
    date?: string
    description?: string
    amount?: number
    type?: 'expense' | 'income'
    category?: string
    merchant?: string
  }
  confidence?: string | null
  note?: string
}

interface CreateTransactionRequest {
  type: 'expense' | 'income'
  amount: number
  categoryId: null
  transactionDate: string
  description: string
  isRecurring: boolean
  recurringInterval: null
}

function StepBar({ current }: { current: number }) {
  return (
    <div className="bg-[#EDF4EE] rounded-xl p-4 flex flex-wrap gap-6 mb-6">
      {steps.map((step) => (
        <div key={step.n} className="flex items-center gap-3">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${
              step.n <= current ? 'bg-[#2D5240]' : 'bg-gray-300'
            }`}
          >
            {step.n}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{step.title}</div>
            <div className="text-xs text-gray-500">{step.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const createEmptyDraft = (): ReceiptDraft => ({
  merchant: '',
  date: '',
  amount: '',
  category: 'Grocery',
  description: '',
  kind: 'Expense',
  receiptText: '',
})

const buildReviewSourceText = (file: File) =>
  `Selected file: ${file.name}\nType: ${file.type || 'Unknown file type'}`

const isValidIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsedDate = new Date(`${value}T00:00:00`)
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value
}

export default function SmartScan() {
  // Receipt extraction hits the same (possibly cold) AI microservice, so
  // start waking it while the user is still picking a file.
  useEffect(() => {
    warmUpAiService()
  }, [])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploaded, setUploaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [confidence, setConfidence] = useState<string | null>(null)
  const [draft, setDraft] = useState<ReceiptDraft>(createEmptyDraft())

  const requestReceiptExtraction = async () => {
    if (!selectedFile) {
      setError('Please choose a JPG, PNG, or WEBP receipt image before scanning.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentType', 'receipt')

      const response = await api.post<ExtractReceiptResponse>('/ai/extract-receipt', formData)
      const payload = response.data

      setDraft({
        merchant: payload.draftTransaction?.merchant ?? payload.merchant ?? '',
        date: payload.draftTransaction?.date ?? payload.date ?? '',
        amount: String(payload.draftTransaction?.amount ?? payload.totalAmount ?? ''),
        category: payload.draftTransaction?.category ?? payload.categorySuggestion ?? 'Grocery',
        description: payload.draftTransaction?.description ?? payload.description ?? '',
        kind: payload.draftTransaction?.type === 'income' ? 'Income' : 'Expense',
        receiptText: buildReviewSourceText(selectedFile),
      })
      setConfidence(payload.confidence ?? null)
      setNote(payload.note || 'Draft transaction generated from receipt scan. Please review before saving.')
      setUploaded(true)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } }
      setError(
        apiError.response?.data?.message ??
          apiError.response?.data?.error ??
          'Unable to scan this receipt right now.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const resetFlow = () => {
    setSelectedFile(null)
    setUploaded(false)
    setError('')
    setNote('')
    setConfidence(null)
    setDraft(createEmptyDraft())
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      return
    }

    if (!supportedMimeTypes.includes(file.type)) {
      setSelectedFile(null)
      setError('Please upload a JPG, PNG, or WEBP receipt image.')
      return
    }

    setSelectedFile(file)
    setError('')
  }

  if (uploaded) {
    return (
      <ReceiptReview
        draft={draft}
        note={note}
        confidence={confidence}
        onBack={resetFlow}
        onDraftChange={setDraft}
      />
    )
  }

  return (
    <Layout title="Smart Scan">
      <div className="text-sm text-gray-400 mb-4">
        <Link to="/transactions" className="hover:underline">
          {'<-'} Transactions
        </Link>{' '}
        / <span className="text-gray-700 font-medium">Smart Scan</span>
      </div>

      <StepBar current={1} />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Upload a receipt image</h2>
        <p className="text-sm text-gray-500 mb-6">
          Choose a clear photo or screenshot of your receipt.
          <br />
          We will generate a draft transaction for you to review and edit.
        </p>
        <div
          onClick={() => {
            if (!isLoading) {
              fileInputRef.current?.click()
            }
          }}
          className={`border-2 border-dashed rounded-xl py-14 mb-6 transition ${
            isLoading
              ? 'border-gray-200 bg-gray-50 cursor-wait'
              : 'border-gray-200 cursor-pointer hover:border-[#3D6B4F]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
          />
          <div className="text-3xl mb-2">{isLoading ? '...' : '^'}</div>
          <div className="font-semibold text-gray-900">
            {selectedFile ? selectedFile.name : isLoading ? 'Scanning receipt...' : 'Choose receipt image'}
          </div>
          <div className="text-sm text-gray-400">
            {selectedFile
              ? selectedFile.type || 'Unknown file type'
              : isLoading
                ? 'Uploading image securely'
                : 'Supported formats: JPG, PNG, WEBP'}
          </div>
        </div>
        <button
          onClick={() => void requestReceiptExtraction()}
          disabled={isLoading || !selectedFile}
          className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] mb-4 disabled:opacity-60"
        >
          {isLoading ? 'Scanning...' : 'Scan receipt'}
        </button>
        <div className="text-sm text-gray-400 mb-4">or</div>
        <button className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 mb-4">
          + Add transaction manually
        </button>
        <div className="text-xs text-gray-400">
          {selectedFile
            ? 'Draft transaction will be generated from your uploaded receipt image.'
            : 'Select a receipt image to generate an editable draft transaction.'}
        </div>
      </div>
    </Layout>
  )
}

function ReceiptReview({
  draft,
  note,
  confidence,
  onBack,
  onDraftChange,
}: {
  draft: ReceiptDraft
  note: string
  confidence: string | null
  onBack: () => void
  onDraftChange: React.Dispatch<React.SetStateAction<ReceiptDraft>>
}) {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  const updateField = (field: keyof ReceiptDraft, value: string) => {
    onDraftChange((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveTransaction = async () => {
    const parsedAmount = Number(draft.amount)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSaveError('Please enter a valid amount greater than 0 before saving.')
      setSaveSuccess('')
      return
    }

    if (!isValidIsoDate(draft.date)) {
      setSaveError('Please enter a valid date in YYYY-MM-DD format before saving.')
      setSaveSuccess('')
      return
    }

    const payload: CreateTransactionRequest = {
      type: draft.kind === 'Income' ? 'income' : 'expense',
      amount: parsedAmount,
      categoryId: null,
      transactionDate: draft.date,
      description: draft.description.trim(),
      isRecurring: false,
      recurringInterval: null,
    }

    setIsSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      await api.post('/transactions', payload)
      setSaveSuccess('Transaction saved successfully. Redirecting to Transactions...')
      window.setTimeout(() => {
        navigate('/transactions')
      }, 900)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } }
      setSaveError(
        apiError.response?.data?.message ??
          apiError.response?.data?.error ??
          'Unable to save this transaction right now.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Layout title="Receipt Information">
      <div className="text-sm text-gray-400 mb-4">
        <button onClick={onBack} className="hover:underline">
          {'<-'} Re-upload
        </button>{' '}
        / <span className="text-gray-700 font-medium">Receipt Information</span>
      </div>

      <StepBar current={3} />

      <div className="bg-green-50 border border-green-200 text-green-900 rounded-xl px-4 py-3 text-sm mb-6">
        <span className="font-semibold">Draft transaction generated from receipt scan.</span>{' '}
        {note || 'Please review the details before saving.'}
      </div>

      {saveError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {saveSuccess}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Uploaded receipt</h2>
          <span className="text-xs font-semibold text-green-700">{confidence ? confidence : 'Ready for review'}</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
          {draft.receiptText}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-semibold text-gray-900">Extracted transaction details</h2>
          <span className="flex items-center gap-1 text-xs text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Draft ready
          </span>
          <span className="flex items-center gap-1 text-xs text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Review suggested
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5 max-w-sm">
          <button
            onClick={() => updateField('kind', 'Expense')}
            className={`h-10 rounded-xl text-sm font-semibold border ${
              draft.kind === 'Expense' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            Expense
          </button>
          <button
            onClick={() => updateField('kind', 'Income')}
            className={`h-10 rounded-xl text-sm font-semibold border ${
              draft.kind === 'Income' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            Income
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="Amount">
            <input value={draft.amount} onChange={(e) => updateField('amount', e.target.value)} className="input" />
          </Field>
          <Field label="Date">
            <input value={draft.date} onChange={(e) => updateField('date', e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Merchant">
          <input value={draft.merchant} onChange={(e) => updateField('merchant', e.target.value)} className="input" />
        </Field>
        <div className="mb-4">
          <label className="label">Description</label>
          <input
            value={draft.description}
            onChange={(e) => updateField('description', e.target.value)}
            className="input border-amber-300 bg-amber-50"
          />
        </div>

        <div className="mb-5">
          <label className="label">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => updateField('category', category.name)}
                className={`px-3 py-2 rounded-xl border text-sm flex flex-col items-center gap-1 min-w-[64px] ${
                  draft.category === category.name
                    ? 'border-[#3D6B4F] bg-[#EDF4EE] text-[#2D5240]'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-5">
          <div>
            <div className="text-sm font-medium text-gray-900">Mark as recurring</div>
            <div className="text-xs text-gray-400">Auto-add this transaction and choose how often</div>
          </div>
          <div className="w-11 h-6 rounded-full bg-gray-200 relative">
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={isSaving}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSaveTransaction()}
            disabled={isSaving}
            className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save transaction'}
          </button>
        </div>
      </div>

      <style>{`
        .input { width:100%; height:44px; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0 14px; font-size:0.875rem; outline:none; }
        .input:focus { border-color:#3D6B4F; }
        .label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.03em; margin-bottom:6px; }
      `}</style>
    </Layout>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
