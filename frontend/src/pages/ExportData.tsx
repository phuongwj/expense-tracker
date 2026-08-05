import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../services/api'
import { getGroups } from '../services/groupService'
import type { GroupSummary } from '@expense-tracker/shared/groups'

const typeOptions = ['All', 'Expenses', 'Income'] as const
const PERSONAL_SCOPE = 'personal'

interface ExportPreviewRow {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  source: 'csv_import'
  createdAt: string
}

interface ExportPreviewResponse {
  summary: {
    rowCount: number
    totalIncome: number
    totalExpenses: number
    netAmount: number
  }
  rows: ExportPreviewRow[]
}

const emptyPreview: ExportPreviewResponse = {
  summary: {
    rowCount: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
  },
  rows: [],
}

const formatCurrency = (value: number) =>
  `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`

const csvHeaders = ['date', 'description', 'amount', 'type', 'category', 'source', 'createdAt'] as const

const escapeCsvValue = (value: string | number) => {
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

const buildCsvContent = (rows: ExportPreviewRow[]) => {
  const headerRow = csvHeaders.join(',')
  const csvRows = rows.map((row) =>
    csvHeaders.map((header) => escapeCsvValue(row[header])).join(',')
  )

  return [headerRow, ...csvRows].join('\n')
}

export default function ExportData() {
  const [scope, setScope] = useState(PERSONAL_SCOPE)
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [type, setType] = useState<(typeof typeOptions)[number]>('All')
  const [category, setCategory] = useState('All categories')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [downloadSuccess, setDownloadSuccess] = useState('')
  const [preview, setPreview] = useState<ExportPreviewResponse>(emptyPreview)
  const [hasLoadedPreview, setHasLoadedPreview] = useState(false)

  useEffect(() => {
    getGroups()
      .then(setGroups)
      .catch(() => {
        // Group export is optional UI; a failed group list fetch shouldn't block personal export.
      })
  }, [])

  const availableCategories = useMemo(
    () => ['All categories', ...Array.from(new Set(preview.rows.map((row) => row.category)))],
    [preview.rows]
  )

  const buildExportFilters = (selectedType: (typeof typeOptions)[number] = type) => ({
    type: selectedType === 'All' ? 'all' : selectedType === 'Income' ? 'income' : 'expense',
    category: category === 'All categories' ? undefined : category,
    startDate: from || undefined,
    endDate: to || undefined,
  })

  const fetchPreview = async (
    overrideType?: (typeof typeOptions)[number],
    overrideScope?: string
  ) => {
    setIsPreviewLoading(true)
    setPreviewError('')

    const effectiveType = overrideType ?? type
    const effectiveScope = overrideScope ?? scope
    const endpoint =
      effectiveScope === PERSONAL_SCOPE
        ? '/export/preview'
        : `/export/group/${effectiveScope}/preview`

    try {
      const response = await api.post<ExportPreviewResponse>(
        endpoint,
        buildExportFilters(effectiveType)
      )

      setPreview(response.data)
      setHasLoadedPreview(true)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } }
      setPreviewError(
        apiError.response?.data?.error ??
          apiError.response?.data?.message ??
          'Unable to generate export preview right now.'
      )
      setPreview(emptyPreview)
      setHasLoadedPreview(false)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  useEffect(() => {
    void fetchPreview()
  }, [])

  const handleDownloadCsv = async () => {
    setIsDownloading(true)
    setDownloadError('')
    setDownloadSuccess('')

    try {
      if (!hasLoadedPreview) {
        throw new Error('Refresh preview before downloading CSV.')
      }

      const csvContent = buildCsvContent(preview.rows)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download =
        scope === PERSONAL_SCOPE
          ? 'personal-transactions-export.csv'
          : 'group-transactions-export.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
      setDownloadSuccess('CSV export downloaded from the current preview.')
    } catch (err: unknown) {
      const apiError = err as {
        message?: string
        response?: { data?: { error?: string; message?: string } }
      }
      setDownloadError(
        apiError.message ??
        apiError.response?.data?.error ??
          apiError.response?.data?.message ??
          'Unable to download CSV right now.'
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Layout title="Export Transactions">
      <div className="text-sm text-gray-400 mb-4">
        <Link to="/transactions" className="hover:underline">
          {'<-'} Transactions
        </Link>{' '}
        / <span className="text-gray-700 font-medium">Export</span>
      </div>

      {previewError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {previewError}
        </div>
      )}

      {downloadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {downloadError}
        </div>
      )}

      {downloadSuccess && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {downloadSuccess}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Filters</h2>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="View">
            <select
              value={scope}
              onChange={(event) => {
                const nextScope = event.target.value
                setScope(nextScope)
                setCategory('All categories')
                void fetchPreview(undefined, nextScope)
              }}
              className="input"
            >
              <option value={PERSONAL_SCOPE}>Personal</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="input">
              {availableCategories.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mb-4">
          <label className="label">Transaction type</label>
          <div className="grid grid-cols-3 gap-2 max-w-sm">
            {typeOptions.map((option) => (
              <button
                key={option}
                onClick={() => {
                  setType(option)
                  void fetchPreview(option)
                }}
                className={`h-10 rounded-xl text-sm font-medium border ${
                  type === option ? 'bg-[#3D6B4F] text-white border-[#3D6B4F]' : 'border-gray-200 text-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="From date">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="input" />
          </Field>
          <Field label="To date">
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="input" />
          </Field>
        </div>

        <div className="mb-4">
          <label className="label">Export format</label>
          <div className="max-w-sm">
            <div className="h-10 rounded-xl border border-[#3D6B4F] bg-[#EDF4EE] text-[#2D5240] text-sm font-semibold flex items-center justify-center">
              CSV
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            CSV export is currently supported. PDF export is planned for a future update.
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Export preview and CSV download reflect the selected view's saved transactions.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Preview</h2>
          <span className="text-sm text-gray-400">
            {isPreviewLoading ? 'Refreshing preview...' : `${preview.summary.rowCount} rows match these filters`}
          </span>
        </div>

        <div className="grid sm:grid-cols-4 gap-4 mb-5">
          <SummaryCard label="Rows" value={String(preview.summary.rowCount)} />
          <SummaryCard label="Income" value={formatCurrency(preview.summary.totalIncome)} />
          <SummaryCard label="Expenses" value={formatCurrency(preview.summary.totalExpenses)} />
          <SummaryCard label="Net" value={formatCurrency(preview.summary.netAmount)} />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5 text-gray-800">{row.description}</td>
                  <td className="px-4 py-2.5 text-gray-600">{row.category}</td>
                  <td className="px-4 py-2.5 text-gray-600">{row.date}</td>
                  <td className={`px-4 py-2.5 font-semibold ${row.type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
                    {row.type === 'expense' ? '-' : '+'}${Math.abs(row.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
              {preview.rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No saved transactions match these filters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => void fetchPreview()}
          disabled={isPreviewLoading}
          className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isPreviewLoading ? 'Refreshing...' : 'Refresh preview'}
        </button>
        <button
          onClick={() => void handleDownloadCsv()}
          disabled={isDownloading || isPreviewLoading || !hasLoadedPreview}
          className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] disabled:opacity-50"
        >
          {isDownloading ? 'Downloading...' : 'Download CSV'}
        </button>
      </div>

      <style>{`
        .input { width:100%; height:44px; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0 14px; font-size:0.875rem; outline:none; background:white; }
        .input:focus { border-color:#3D6B4F; }
        .label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.03em; margin-bottom:6px; }
      `}</style>
    </Layout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
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
