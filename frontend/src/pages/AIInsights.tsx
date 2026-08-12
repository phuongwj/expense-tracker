import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'
import { warmUpAiService } from '../services/aiWarmup'

interface InsightsPayload {
  summary: string
  riskLevel: 'low' | 'medium' | 'high'
  positiveNotes: string[]
  warnings: string[]
  recommendations: string[]
  nextActions: string[]
}

interface InsightsResponse {
  summarySent: Record<string, unknown>
  insights: InsightsPayload
}

const riskStyles: Record<InsightsPayload['riskLevel'], { label: string; className: string }> = {
  low: {
    label: 'Low risk',
    className: 'bg-green-50 text-green-700',
  },
  medium: {
    label: 'Medium risk',
    className: 'bg-amber-50 text-amber-700',
  },
  high: {
    label: 'High risk',
    className: 'bg-red-50 text-red-700',
  },
}

const sectionConfig = [
  {
    key: 'positiveNotes',
    title: 'Positive Notes',
    icon: '↑',
    borderClass: 'border-l-4 border-l-green-500',
  },
  {
    key: 'warnings',
    title: 'Warnings',
    icon: '!',
    borderClass: 'border-l-4 border-l-amber-400',
  },
  {
    key: 'recommendations',
    title: 'Recommendations',
    icon: '+',
    borderClass: 'border-l-4 border-l-[#3D6B4F]',
  },
  {
    key: 'nextActions',
    title: 'Next Actions',
    icon: '→',
    borderClass: 'border-l-4 border-l-gray-300',
  },
] as const

export default function AIInsights() {
  const [insights, setInsights] = useState<InsightsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchInsights = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await api.post<InsightsResponse>('/ai/insights', {})
      setInsights(response.data.insights)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } }
      setError(apiError.response?.data?.message ?? apiError.response?.data?.error ?? 'Unable to load AI insights right now.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Landing straight on this page is the worst case for a cold instance:
    // the insights request fires immediately. Ping alongside it so a boot is
    // already under way if this request has to give up.
    void warmUpAiService()
    void fetchInsights()
  }, [])

  const riskStyle = insights ? riskStyles[insights.riskLevel] : riskStyles.medium

  return (
    <Layout
      title="AI Insights"
      headerActions={
        <button
          onClick={() => void fetchInsights()}
          disabled={isLoading}
          className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 disabled:opacity-60"
        >
          {isLoading ? 'Refreshing...' : 'Refresh insights'}
        </button>
      }
    >
      <div className="bg-[#2D5240] rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="text-xs uppercase tracking-wide text-white/60">AI Summary</div>
          {insights && (
            <span className={`text-xs font-semibold rounded px-2 py-1 ${riskStyle.className}`}>
              {riskStyle.label}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold">
          {isLoading ? 'Generating your financial insight summary...' : insights?.summary ?? 'AI insights are ready when requested.'}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500">
          Loading AI insights...
        </div>
      ) : insights ? (
        <div className="flex flex-col gap-4">
          {sectionConfig.map((section) => {
            const items = insights[section.key]

            return (
              <div key={section.key} className={`bg-white rounded-2xl border border-gray-100 p-5 ${section.borderClass}`}>
                <div className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                  <span>{section.icon}</span>
                  {section.title}
                </div>

                {items.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {items.map((item) => (
                      <div key={item} className="text-sm text-gray-600">
                        {item}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No items available in this section.</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500">
          No AI insights available yet.
        </div>
      )}
    </Layout>
  )
}
