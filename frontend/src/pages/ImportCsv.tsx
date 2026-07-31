import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../services/api'

const steps = [
  { n: 1, title: 'Upload', sub: 'CSV file of your transactions' },
  { n: 2, title: 'Preview & review', sub: 'Check valid rows and any errors' },
  { n: 3, title: 'Import', sub: 'Rows are saved in the backend mock store' },
]

type TransactionType = 'income' | 'expense'

interface ReviewedRow {
  id: string
  include: boolean
  date: string
  description: string
  amount: string
  type: TransactionType
  category: string
}

interface InvalidRow {
  rowNumber: number
  row: {
    date: string
    description: string
    amount: string
    type: string
    category: string
  }
  errors: string[]
}

interface ImportPreviewResponse {
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
  validRows: Array<{
    date: string
    description: string
    amount: number
    type: TransactionType
    category: string
  }>
  invalidRows: InvalidRow[]
}

interface ImportConfirmResponse {
  savedCount: number
  skippedCount: number
  savedTransactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    type: TransactionType
    category: string
    source: 'csv_import'
    createdAt: string
  }>
  skippedRows: InvalidRow[]
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

const emptyPreview: ImportPreviewResponse = {
  summary: {
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
  },
  validRows: [],
  invalidRows: [],
}

const createReviewedRows = (validRows: ImportPreviewResponse['validRows']): ReviewedRow[] =>
  validRows.map((row, index) => ({
    id: `valid-${index + 1}`,
    include: true,
    date: row.date,
    description: row.description,
    amount: String(row.amount),
    type: row.type,
    category: row.category,
  }))

export default function ImportCsv() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploaded, setUploaded] = useState(false)
  const [fileName, setFileName] = useState('')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [preview, setPreview] = useState<ImportPreviewResponse>(emptyPreview)
  const [rows, setRows] = useState<ReviewedRow[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)

  const handleUpload = async (file: File | null) => {
    if (!file) {
      return
    }

    setSelectedFile(file)
    setFileName(file.name)
    setPreviewError('')
    setImportError('')
    setImportSuccess('')
    setIsPreviewLoading(true)

    try {
      const csvText = await file.text()
      const response = await api.post<ImportPreviewResponse>('/import/preview', {
        csvText,
      })

      setPreview(response.data)
      setRows(createReviewedRows(response.data.validRows))
      setUploaded(true)
      setSavedCount(0)
      setSkippedCount(0)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } }
      setPreviewError(
        apiError.response?.data?.error ??
          apiError.response?.data?.message ??
          'Unable to generate an import preview right now.'
      )
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const resetFlow = () => {
    setSelectedFile(null)
    setUploaded(false)
    setFileName('')
    setPreviewError('')
    setImportError('')
    setImportSuccess('')
    setPreview(emptyPreview)
    setRows([])
    setSavedCount(0)
    setSkippedCount(0)
  }

  const toggleRow = (id: string) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, include: !row.include } : row))
    )
  }

  const updateRow = (id: string, field: keyof ReviewedRow, value: string) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const includedCount = rows.filter((row) => row.include).length

  const reviewCount = useMemo(() => preview.invalidRows.length, [preview.invalidRows.length])

  const handleConfirmImport = async () => {
    const includedRows = rows
      .filter((row) => row.include)
      .map((row) => ({
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        category: row.category,
      }))

    if (includedRows.length === 0) {
      setImportError('Select at least one valid row before confirming import.')
      setImportSuccess('')
      return
    }

    setIsImporting(true)
    setImportError('')
    setImportSuccess('')

    try {
      const response = await api.post<ImportConfirmResponse>('/import/confirm', {
        rows: includedRows,
      })

      setSavedCount(response.data.savedCount)
      setSkippedCount(response.data.skippedCount)
      setImportSuccess(
        `Import complete. Saved ${response.data.savedCount} row${
          response.data.savedCount === 1 ? '' : 's'
        } and skipped ${response.data.skippedCount}.`
      )
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } }
      setImportError(
        apiError.response?.data?.error ??
          apiError.response?.data?.message ??
          'Unable to confirm this import right now.'
      )
    } finally {
      setIsImporting(false)
    }
  }

  if (!uploaded) {
    return (
      <Layout title="Import Transactions">
        <div className="text-sm text-gray-400 mb-4">
          <Link to="/transactions" className="hover:underline">
            {'<-'} Transactions
          </Link>{' '}
          / <span className="text-gray-700 font-medium">Import CSV</span>
        </div>

        <StepBar current={1} />

        {previewError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {previewError}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Upload a CSV file</h2>
          <p className="text-sm text-gray-500 mb-6">
            Export a statement from your bank or spreadsheet as CSV, then upload it here.
            <br />
            The backend will preview valid rows and flag any validation problems.
          </p>
          <label
            className={`block border-2 border-dashed rounded-xl py-14 mb-6 transition ${
              isPreviewLoading
                ? 'border-gray-200 bg-gray-50 cursor-wait'
                : 'border-gray-200 cursor-pointer hover:border-[#3D6B4F]'
            }`}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={isPreviewLoading}
              onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
            />
            <div className="text-3xl mb-2">{isPreviewLoading ? '...' : '^'}</div>
            <div className="font-semibold text-gray-900">
              {isPreviewLoading ? 'Generating preview...' : selectedFile ? selectedFile.name : 'Choose your CSV file'}
            </div>
            <div className="text-sm text-gray-400">
              {isPreviewLoading ? 'Sending CSV to the backend preview endpoint' : 'Click to browse for a .csv file'}
            </div>
          </label>
          <div className="text-xs text-gray-400">Supports .csv. Required columns: date, description, amount, type, category.</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Expected columns</h3>
          <p className="text-xs text-gray-500 mb-3">
            Your file must include these exact logical fields. The backend validates them before any import is confirmed.
          </p>
          <div className="flex flex-wrap gap-2">
            {['date', 'description', 'amount', 'type', 'category'].map((column) => (
              <span key={column} className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600">
                {column}
              </span>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title="Import Transactions"
      headerActions={
        <button
          onClick={resetFlow}
          className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700"
        >
          Re-upload
        </button>
      }
    >
      <div className="text-sm text-gray-400 mb-4">
        <button onClick={resetFlow} className="hover:underline">
          {'<-'} Re-upload
        </button>{' '}
        / <span className="text-gray-700 font-medium">Preview & confirm</span>
      </div>

      <StepBar current={2} />

      {importError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {importError}
        </div>
      )}

      {importSuccess && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {importSuccess}
        </div>
      )}

      <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-900 rounded-xl px-4 py-3 text-sm mb-6">
        <span>
          <span className="font-semibold">Parsed "{fileName}".</span> {preview.summary.totalRows} row
          {preview.summary.totalRows === 1 ? '' : 's'} detected. {preview.summary.validRows} valid and {reviewCount} invalid.
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <SummaryCard label="Total rows" value={String(preview.summary.totalRows)} />
          <SummaryCard label="Valid rows" value={String(preview.summary.validRows)} />
          <SummaryCard label="Invalid rows" value={String(preview.summary.invalidRows)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Valid rows ready for import</h2>
          <p className="text-sm text-gray-500 mt-1">Review these rows before confirming import.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No valid rows are available to import.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className={row.include ? '' : 'opacity-40'}>
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={() => toggleRow(row.id)}
                    className="w-4 h-4 accent-[#3D6B4F]"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    value={row.description}
                    onChange={(event) => updateRow(row.id, 'description', event.target.value)}
                    className="w-full h-9 rounded-lg border border-gray-200 px-2.5 text-sm outline-none focus:border-[#3D6B4F]"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(event) => updateRow(row.id, 'date', event.target.value)}
                    className="w-full h-9 rounded-lg border border-gray-200 px-2.5 text-sm outline-none focus:border-[#3D6B4F]"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    value={row.amount}
                    onChange={(event) => updateRow(row.id, 'amount', event.target.value)}
                    className="w-24 h-9 rounded-lg border border-gray-200 px-2.5 text-sm outline-none focus:border-[#3D6B4F]"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={row.type}
                    onChange={(event) => updateRow(row.id, 'type', event.target.value)}
                    className="h-9 rounded-lg border border-gray-200 px-2 text-sm outline-none focus:border-[#3D6B4F]"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <input
                    value={row.category}
                    onChange={(event) => updateRow(row.id, 'category', event.target.value)}
                    className="w-full h-9 rounded-lg border border-gray-200 px-2.5 text-sm outline-none focus:border-[#3D6B4F]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Invalid rows and validation errors</h2>
          <p className="text-sm text-gray-500 mt-1">These rows were rejected by backend validation and are not included in confirm import.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {preview.invalidRows.length === 0 && (
            <div className="px-5 py-6 text-sm text-gray-500">No validation errors were found.</div>
          )}
          {preview.invalidRows.map((row) => (
            <div key={`invalid-${row.rowNumber}`} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-gray-900">Row {row.rowNumber}</span>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  Needs review
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {row.row.description || '(No description)'} | {row.row.date || '(No date)'} | {row.row.amount || '(No amount)'} | {row.row.type || '(No type)'} | {row.row.category || '(No category)'}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.errors.map((error) => (
                  <span key={error} className="px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {error}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-5">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{includedCount}</span> valid row
          {includedCount === 1 ? '' : 's'} selected for import
          {(savedCount > 0 || skippedCount > 0) && (
            <span className="ml-2 text-gray-500">Saved {savedCount}, skipped {skippedCount} on the last confirm.</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/transactions')}
            className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to transactions
          </button>
          <button
            onClick={() => void handleConfirmImport()}
            disabled={isImporting || includedCount === 0}
            className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : `Import ${includedCount} row${includedCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </Layout>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  )
}
