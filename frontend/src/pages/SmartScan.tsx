import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { categories } from '../data/mockData'
import api from '../services/api'

const steps = [
  { n: 1, title: 'Upload', sub: 'Photo or PDF of your receipt' },
  { n: 2, title: 'Text is extracted', sub: 'Amount, date, merchant auto-filled' },
  { n: 3, title: 'Review & save', sub: 'Correct anything and confirm' },
]

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
  merchant: string
  date: string
  totalAmount: number
  categorySuggestion: string
  description: string
  draftTransaction?: {
    date?: string
    description?: string
    amount?: number
    type?: 'expense' | 'income'
    category?: string
    merchant?: string
  }
  confidence: string | null
  note: string
}

const demoReceiptText = 'Walmart receipt total 25.99 on 2026-06-18 for groceries'

function StepBar({ current }: { current: number }) {
  return (
    <div className="bg-[#EDF4EE] rounded-xl p-4 flex flex-wrap gap-6 mb-6">
      {steps.map((s) => (
        <div key={s.n} className="flex items-center gap-3">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${
              s.n <= current ? 'bg-[#2D5240]' : 'bg-gray-300'
            }`}
          >
            {s.n}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{s.title}</div>
            <div className="text-xs text-gray-500">{s.sub}</div>
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
  receiptText: demoReceiptText,
})

export default function SmartScan() {
  const [uploaded, setUploaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [confidence, setConfidence] = useState<string | null>(null)
  const [draft, setDraft] = useState<ReceiptDraft>(createEmptyDraft())

  const requestReceiptExtraction = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await api.post<ExtractReceiptResponse>('/ai/extract-receipt', {
        fileName: 'receipt-demo.txt',
        mimeType: 'text/plain',
        documentType: 'receipt',
        receiptText: demoReceiptText,
      })

      const payload = response.data

      setDraft({
        merchant: payload.draftTransaction?.merchant ?? payload.merchant,
        date: payload.draftTransaction?.date ?? payload.date,
        amount: String(payload.draftTransaction?.amount ?? payload.totalAmount),
        category: payload.draftTransaction?.category ?? payload.categorySuggestion,
        description: payload.draftTransaction?.description ?? payload.description,
        kind: payload.draftTransaction?.type === 'income' ? 'Income' : 'Expense',
        receiptText: demoReceiptText,
      })
      setConfidence(payload.confidence)
      setNote(payload.note)
      setUploaded(true)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } }
      setError(apiError.response?.data?.message ?? apiError.response?.data?.error ?? 'Unable to extract receipt details right now.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetFlow = () => {
    setUploaded(false)
    setError('')
    setNote('')
    setConfidence(null)
    setDraft(createEmptyDraft())
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
          ← Transactions
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
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Upload a receipt or invoice</h2>
        <p className="text-sm text-gray-500 mb-6">
          Take a photo of a store receipt, or upload a saved invoice.
          <br />
          We&apos;ll read the text automatically — you just review and save.
        </p>
        <div
          onClick={() => {
            if (!isLoading) {
              void requestReceiptExtraction()
            }
          }}
          className={`border-2 border-dashed rounded-xl py-14 mb-6 transition ${
            isLoading
              ? 'border-gray-200 bg-gray-50 cursor-wait'
              : 'border-gray-200 cursor-pointer hover:border-[#3D6B4F]'
          }`}
        >
          <div className="text-3xl mb-2">{isLoading ? '…' : '↑'}</div>
          <div className="font-semibold text-gray-900">
            {isLoading ? 'Extracting receipt details...' : 'Use demo receipt extraction'}
          </div>
          <div className="text-sm text-gray-400">
            {isLoading ? 'Calling the protected OCR endpoint now' : 'Phase 1 uses demo metadata and receipt text'}
          </div>
        </div>
        <button
          onClick={() => void requestReceiptExtraction()}
          disabled={isLoading}
          className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] mb-4 disabled:opacity-60"
        >
          {isLoading ? 'Extracting...' : 'Run demo extraction'}
        </button>
        <div className="text-sm text-gray-400 mb-4">or</div>
        <button className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 mb-4">
          + Add transaction manually
        </button>
        <div className="text-xs text-gray-400">Phase 1 sends demo metadata and receipt text to the backend OCR endpoint</div>
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

  const updateField = (field: keyof ReceiptDraft, value: string) => {
    onDraftChange((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Layout title="Receipt Information">
      <div className="text-sm text-gray-400 mb-4">
        <button onClick={onBack} className="hover:underline">
          ← Re-upload
        </button>{' '}
        / <span className="text-gray-700 font-medium">Receipt Information</span>
      </div>

      <StepBar current={3} />

      <div className="bg-green-50 border border-green-200 text-green-900 rounded-xl px-4 py-3 text-sm mb-6">
        <span className="font-semibold">✓ Extracted — please review before saving.</span>{' '}
        {note || 'Mock OCR details were returned by the protected backend endpoint.'}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Uploaded receipt</h2>
          <span className="text-xs font-semibold text-green-700">{confidence ? confidence : 'Mock extraction result'}</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
          {draft.receiptText}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-semibold text-gray-900">Extracted transaction details</h2>
          <span className="flex items-center gap-1 text-xs text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Backend connected
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
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => updateField('category', c.name)}
                className={`px-3 py-2 rounded-xl border text-sm flex flex-col items-center gap-1 min-w-[64px] ${
                  draft.category === c.name ? 'border-[#3D6B4F] bg-[#EDF4EE] text-[#2D5240]' : 'border-gray-200 text-gray-600'
                }`}
              >
                <span>{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-5">
          <div>
            <div className="text-sm font-medium text-gray-900">Mark as recurring</div>
            <div className="text-xs text-gray-400">Auto-add this transaction — choose how often</div>
          </div>
          <div className="w-11 h-6 rounded-full bg-gray-200 relative">
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => navigate('/transactions')}
            className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]"
          >
            ✓ Save transaction
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
